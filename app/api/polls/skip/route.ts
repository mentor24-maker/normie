import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getScoringRulePointsByName, SKIP_QUESTION_SCORE_NAME } from "@/lib/game-scoring-points";
import { countPlayerProgressPollsFromDb } from "@/lib/player-poll-stats";
import { PLAYER_LEVEL_UP_INTERVAL, PLAYER_LEVEL_UP_PENDING_COOKIE } from "@/lib/player-level-up-event";
import { POLL_SKIP_FEATURE_KEY, playerHasPollSkip } from "@/lib/player-unlocked-features";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { isPollTestModeRequest, readPollTestPin } from "@/lib/poll-test-mode";
import { getRequestClientIp, isUuid, safePublicText } from "@/lib/public-request";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";

const SESSION_RATE_LIMIT = 20;
const SESSION_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT = 40;
const IP_WINDOW_SECONDS = 60;

async function loadPollSkipEligibility(playerId: string) {
  const supabase = createAdminClient();
  const [progressPolls, { data: rewards, error: rewardsError }, { data: features, error: featuresError }] =
    await Promise.all([
      countPlayerProgressPollsFromDb(supabase, playerId),
      supabase.from("game_rewards").select("reward_type, status, metadata").eq("status", "active"),
      supabase.from("game_progressive_features").select("feature_key, is_active").eq("is_active", true)
    ]);

  if (rewardsError && !rewardsError.message.includes("game_rewards")) {
    throw rewardsError;
  }

  if (featuresError && !featuresError.message.includes("game_progressive_features")) {
    throw featuresError;
  }

  return playerHasPollSkip(progressPolls, rewards ?? [], features ?? []);
}

export const POST = withObservedRoute("polls.skip", async (request) => {
  const cookieStore = await cookies();
  const sessionId = safePublicText(cookieStore.get(POLL_SESSION_COOKIE)?.value, 120);
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to skip polls." }, { status: 401 });
  }

  if (!sessionId || !isUuid(sessionId)) {
    return NextResponse.json({ error: "Missing poll session. Refresh and try again." }, { status: 400 });
  }

  const clientIp = getRequestClientIp(request);
  const [sessionLimit, ipLimit] = await Promise.all([
    consumePublicRateLimit(`poll-skip:session:${sessionId}`, SESSION_RATE_LIMIT, SESSION_WINDOW_SECONDS),
    consumePublicRateLimit(`poll-skip:ip:${clientIp}`, IP_RATE_LIMIT, IP_WINDOW_SECONDS)
  ]);

  if (!sessionLimit.allowed) {
    return rateLimitResponse(sessionLimit.retryAfterSeconds);
  }

  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { pollId?: unknown };
  const pollId = safePublicText(body.pollId, 80);

  if (!pollId || !isUuid(pollId)) {
    return NextResponse.json({ error: "pollId is required." }, { status: 400 });
  }

  const pollTestPin = readPollTestPin(cookieStore);

  if (isPollTestModeRequest(request, cookieStore) && pollTestPin === pollId) {
    const progressPolls = await countPlayerProgressPollsFromDb(createAdminClient(), player.authUser.id);
    return NextResponse.json({ ok: true, skipped: false, duplicate: true, playerAnswerCount: progressPolls });
  }

  let canSkip = false;

  try {
    canSkip = await loadPollSkipEligibility(player.authUser.id);
  } catch (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.skip.eligibility_failed",
      error,
      message: "Failed to verify skip eligibility."
    });
  }

  if (!canSkip) {
    return NextResponse.json({ error: "Skip Poll is not unlocked yet." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: existingForPlayer, error: existingForPlayerError } = await supabase
    .from("poll_response")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", player.authUser.id)
    .maybeSingle();

  if (existingForPlayerError) {
    return publicErrorResponse(request, {
      logEvent: "polls.skip.lookup_failed",
      error: existingForPlayerError,
      message: "Failed to skip this poll.",
      context: { pollId }
    });
  }

  if (existingForPlayer) {
    const progressPollCount = await countPlayerProgressPollsFromDb(supabase, player.authUser.id);

    return NextResponse.json({
      ok: true,
      duplicate: true,
      skipped: true,
      playerAnswerCount: progressPollCount
    });
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, poll_options(id, sort_order)")
    .eq("id", pollId)
    .eq("is_published", true)
    .maybeSingle();

  if (pollError) {
    return publicErrorResponse(request, {
      logEvent: "polls.skip.poll_lookup_failed",
      error: pollError,
      message: "Failed to load poll.",
      context: { pollId }
    });
  }

  if (!poll) {
    return NextResponse.json({ error: "This poll is not available." }, { status: 404 });
  }

  const firstOption = [...(poll.poll_options ?? [])].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
  )[0];

  if (!firstOption?.id) {
    return NextResponse.json({ error: "Poll has no answer options." }, { status: 400 });
  }

  const skipPoints = await getScoringRulePointsByName(supabase, SKIP_QUESTION_SCORE_NAME, 1);

  const { error: insertError } = await supabase.from("poll_response").insert({
    session_id: sessionId,
    user_id: player.authUser.id,
    poll_id: pollId,
    option_id: firstOption.id,
    tokens_earned: skipPoints,
    is_skipped: true
  });

  if (insertError) {
    if (insertError.message.includes("is_skipped")) {
      return NextResponse.json(
        { error: "Apply migration 041_poll_response_skipped.sql before using Skip Poll." },
        { status: 500 }
      );
    }

    return publicErrorResponse(request, {
      logEvent: "polls.skip.insert_failed",
      error: insertError,
      message: "Failed to skip this poll.",
      context: { pollId }
    });
  }

  const progressPollCount = await countPlayerProgressPollsFromDb(supabase, player.authUser.id);
  const levelUp =
    progressPollCount > 0 && progressPollCount % PLAYER_LEVEL_UP_INTERVAL === 0;

  const response = NextResponse.json({
    ok: true,
    skipped: true,
    featureKey: POLL_SKIP_FEATURE_KEY,
    playerAnswerCount: progressPollCount,
    levelUp,
    tokensEarned: skipPoints
  });

  if (levelUp) {
    response.cookies.set(PLAYER_LEVEL_UP_PENDING_COOKIE, String(progressPollCount), {
      maxAge: 60,
      path: "/portal",
      sameSite: "lax"
    });
  }

  return response;
});
