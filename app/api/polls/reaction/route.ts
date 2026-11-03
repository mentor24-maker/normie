import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import {
  isPollReactionKind,
  loadPollLikeDislikeEligibility,
  loadPlayerPollReaction,
  playerHasAnsweredPoll,
  resolvePollReactionPoints,
  type PollReactionKind
} from "@/lib/poll-reaction";
import { DEFAULT_POLL_REACTION_POINTS } from "@/lib/game-scoring-points";
import { POLL_LIKE_DISLIKE_FEATURE_KEY } from "@/lib/player-unlocked-features";
import { getRequestClientIp, isUuid, safePublicText } from "@/lib/public-request";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";

const SESSION_RATE_LIMIT = 30;
const SESSION_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT = 60;
const IP_WINDOW_SECONDS = 60;
const UNIQUE_VIOLATION_CODE = "23505";

export const POST = withObservedRoute("polls.reaction", async (request) => {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to react to polls." }, { status: 401 });
  }

  const clientIp = getRequestClientIp(request);
  const sessionId = safePublicText(cookieStore.get(POLL_SESSION_COOKIE)?.value, 120);
  const rateKey = sessionId && isUuid(sessionId) ? sessionId : player.authUser.id;
  const [sessionLimit, ipLimit] = await Promise.all([
    consumePublicRateLimit(`poll-reaction:session:${rateKey}`, SESSION_RATE_LIMIT, SESSION_WINDOW_SECONDS),
    consumePublicRateLimit(`poll-reaction:ip:${clientIp}`, IP_RATE_LIMIT, IP_WINDOW_SECONDS)
  ]);

  if (!sessionLimit.allowed) {
    return rateLimitResponse(sessionLimit.retryAfterSeconds);
  }

  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { pollId?: unknown; reaction?: unknown };
  const pollId = safePublicText(body.pollId, 80);
  const reaction = body.reaction;

  if (!pollId || !isUuid(pollId)) {
    return NextResponse.json({ error: "pollId is required." }, { status: 400 });
  }

  if (!isPollReactionKind(reaction)) {
    return NextResponse.json({ error: "reaction must be like or dislike." }, { status: 400 });
  }

  let eligible = false;

  try {
    eligible = await loadPollLikeDislikeEligibility(player.authUser.id);
  } catch (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.reaction.eligibility_failed",
      error,
      message: "Failed to verify reaction eligibility."
    });
  }

  if (!eligible) {
    return NextResponse.json({ error: "Like and Dislike is not unlocked yet." }, { status: 403 });
  }

  const supabase = createAdminClient();

  let hasAnswered = false;

  try {
    hasAnswered = await playerHasAnsweredPoll(supabase, player.authUser.id, pollId);
  } catch (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.reaction.answer_lookup_failed",
      error,
      message: "Failed to verify poll answer.",
      context: { pollId }
    });
  }

  if (!hasAnswered) {
    return NextResponse.json({ error: "You can only react to polls you have answered." }, { status: 403 });
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .eq("is_published", true)
    .eq("is_hidden", false)
    .maybeSingle();

  if (pollError) {
    return publicErrorResponse(request, {
      logEvent: "polls.reaction.poll_lookup_failed",
      error: pollError,
      message: "Failed to load poll.",
      context: { pollId }
    });
  }

  if (!poll) {
    return NextResponse.json({ error: "This poll is not available." }, { status: 404 });
  }

  let existingReaction: PollReactionKind | null = null;

  try {
    existingReaction = await loadPlayerPollReaction(supabase, player.authUser.id, pollId);
  } catch (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.reaction.lookup_failed",
      error,
      message: "Failed to load your reaction.",
      context: { pollId }
    });
  }

  if (existingReaction) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      reaction: existingReaction,
      featureKey: POLL_LIKE_DISLIKE_FEATURE_KEY
    });
  }

  let tokensEarned = DEFAULT_POLL_REACTION_POINTS;

  try {
    tokensEarned = await resolvePollReactionPoints(supabase, reaction);
  } catch (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.reaction.scoring_failed",
      error,
      message: "Failed to resolve reaction points.",
      context: { pollId, reaction }
    });
  }

  const { error: insertError } = await supabase.from("poll_reaction").insert({
    user_id: player.authUser.id,
    poll_id: pollId,
    reaction,
    tokens_earned: tokensEarned
  });

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION_CODE) {
      const reactionAfterRace = await loadPlayerPollReaction(supabase, player.authUser.id, pollId);

      return NextResponse.json({
        ok: true,
        duplicate: true,
        reaction: reactionAfterRace,
        featureKey: POLL_LIKE_DISLIKE_FEATURE_KEY
      });
    }

    if (insertError.message.includes("poll_reaction")) {
      return NextResponse.json(
        { error: "Apply migration 052_poll_reactions.sql before using Like and Dislike." },
        { status: 500 }
      );
    }

    return publicErrorResponse(request, {
      logEvent: "polls.reaction.insert_failed",
      error: insertError,
      message: "Failed to save your reaction.",
      context: { pollId, reaction }
    });
  }

  return NextResponse.json({
    ok: true,
    reaction,
    tokensEarned,
    featureKey: POLL_LIKE_DISLIKE_FEATURE_KEY
  });
});
