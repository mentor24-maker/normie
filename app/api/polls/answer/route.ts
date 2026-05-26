import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { validatePollAnswerSubmission } from "@/lib/poll-answer-validation";
import { PLAYER_LEVEL_UP_INTERVAL, PLAYER_LEVEL_UP_PENDING_COOKIE } from "@/lib/player-level-up-event";
import { getRequestClientIp, isUuid, safePublicText } from "@/lib/public-request";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";

const SESSION_COOKIE = "poll_session_id";
const SESSION_RATE_LIMIT = 40;
const SESSION_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT = 80;
const IP_WINDOW_SECONDS = 60;
const TOKENS_PER_ANSWER = 1;
const UNIQUE_VIOLATION_CODE = "23505";

async function getPlayerAnswerCount(supabase: ReturnType<typeof createAdminClient>, playerId: string) {
  const { count, error } = await supabase
    .from("poll_response")
    .select("id", { count: "exact", head: true })
    .eq("user_id", playerId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function playerAnswerResponse(
  supabase: ReturnType<typeof createAdminClient>,
  playerId: string,
  flags: Record<string, boolean> = {}
) {
  const answerCount = await getPlayerAnswerCount(supabase, playerId);
  const levelUp = answerCount > 0 && answerCount % PLAYER_LEVEL_UP_INTERVAL === 0 && !flags.duplicate;
  const response = NextResponse.json({
    ok: true,
    ...flags,
    playerAnswerCount: answerCount,
    levelUp
  });

  if (levelUp) {
    response.cookies.set(PLAYER_LEVEL_UP_PENDING_COOKIE, String(answerCount), {
      maxAge: 60,
      path: "/portal",
      sameSite: "lax"
    });
  }

  return response;
}

export const POST = withObservedRoute("polls.answer", async (request) => {
  const cookieStore = await cookies();
  const sessionId = safePublicText(cookieStore.get(SESSION_COOKIE)?.value, 120);
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!sessionId || !isUuid(sessionId)) {
    return NextResponse.json({ error: "Missing poll session. Refresh and try again." }, { status: 400 });
  }

  const clientIp = getRequestClientIp(request);
  const [sessionLimit, ipLimit] = await Promise.all([
    consumePublicRateLimit(`poll-answer:session:${sessionId}`, SESSION_RATE_LIMIT, SESSION_WINDOW_SECONDS),
    consumePublicRateLimit(`poll-answer:ip:${clientIp}`, IP_RATE_LIMIT, IP_WINDOW_SECONDS)
  ]);

  if (!sessionLimit.allowed) {
    return rateLimitResponse(sessionLimit.retryAfterSeconds);
  }

  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { pollId?: unknown; optionId?: unknown };
  const pollId = safePublicText(body.pollId, 80);
  const optionId = safePublicText(body.optionId, 80);

  if (!pollId || !optionId) {
    return NextResponse.json({ error: "pollId and optionId are required." }, { status: 400 });
  }

  const validation = await validatePollAnswerSubmission(pollId, optionId);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const supabase = createAdminClient();

  if (player) {
    const { data: existingForPlayer, error: existingForPlayerError } = await supabase
      .from("poll_response")
      .select("id")
      .eq("poll_id", validation.pollId)
      .eq("user_id", player.authUser.id)
      .maybeSingle();

    if (existingForPlayerError) {
      return publicErrorResponse(request, {
        logEvent: "polls.answer.lookup_failed",
        error: existingForPlayerError,
        message: "Failed to save your answer.",
        context: { pollId }
      });
    }

    if (existingForPlayer) {
      return playerAnswerResponse(supabase, player.authUser.id, { duplicate: true });
    }

    const { data: anonymousSessionAnswer, error: anonymousSessionError } = await supabase
      .from("poll_response")
      .select("id")
      .eq("poll_id", validation.pollId)
      .eq("session_id", sessionId)
      .is("user_id", null)
      .maybeSingle();

    if (anonymousSessionError) {
      return publicErrorResponse(request, {
        logEvent: "polls.answer.lookup_failed",
        error: anonymousSessionError,
        message: "Failed to save your answer.",
        context: { pollId }
      });
    }

    if (anonymousSessionAnswer) {
      const { error: claimError } = await supabase
        .from("poll_response")
        .update({
          user_id: player.authUser.id,
          tokens_earned: TOKENS_PER_ANSWER
        })
        .eq("id", anonymousSessionAnswer.id);

      if (claimError) {
        return publicErrorResponse(request, {
          logEvent: "polls.answer.claim_failed",
          error: claimError,
          message: "Failed to save your answer.",
          context: { pollId }
        });
      }

      return playerAnswerResponse(supabase, player.authUser.id, { claimed: true });
    }
  } else {
    const { data: existing, error: existingError } = await supabase
      .from("poll_response")
      .select("id")
      .eq("poll_id", validation.pollId)
      .eq("session_id", sessionId)
      .is("user_id", null)
      .maybeSingle();

    if (existingError) {
      return publicErrorResponse(request, {
        logEvent: "polls.answer.lookup_failed",
        error: existingError,
        message: "Failed to save your answer.",
        context: { pollId }
      });
    }

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  const { error } = await supabase.from("poll_response").insert({
    session_id: sessionId,
    user_id: player?.authUser.id ?? null,
    poll_id: validation.pollId,
    option_id: validation.optionId,
    tokens_earned: player ? TOKENS_PER_ANSWER : 0
  });

  if (error) {
    if (player && error.code === UNIQUE_VIOLATION_CODE) {
      const { error: claimError } = await supabase
        .from("poll_response")
        .update({
          user_id: player.authUser.id,
          option_id: validation.optionId,
          tokens_earned: TOKENS_PER_ANSWER
        })
        .eq("poll_id", validation.pollId)
        .eq("session_id", sessionId);

      if (!claimError) {
        return playerAnswerResponse(supabase, player.authUser.id, { claimed: true });
      }
    }

    if (!player && error.code === UNIQUE_VIOLATION_CODE) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return publicErrorResponse(request, {
      logEvent: "polls.answer.insert_failed",
      error,
      message: "Failed to save your answer.",
      context: { pollId }
    });
  }

  if (player) {
    return playerAnswerResponse(supabase, player.authUser.id);
  }

  return NextResponse.json({ ok: true, levelUp: false });
});
