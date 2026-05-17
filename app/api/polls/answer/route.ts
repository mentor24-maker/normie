import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { validatePollAnswerSubmission } from "@/lib/poll-answer-validation";
import { getRequestClientIp, isUuid, safePublicText } from "@/lib/public-request";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createPublicClient } from "@/lib/supabase-public";

const SESSION_COOKIE = "poll_session_id";
const SESSION_RATE_LIMIT = 40;
const SESSION_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT = 80;
const IP_WINDOW_SECONDS = 60;

export const POST = withObservedRoute("polls.answer", async (request) => {
  const cookieStore = await cookies();
  const sessionId = safePublicText(cookieStore.get(SESSION_COOKIE)?.value, 120);

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

  const supabase = createPublicClient();

  const { data: existing, error: existingError } = await supabase
    .from("responses")
    .select("id")
    .eq("session_id", sessionId)
    .eq("poll_id", validation.pollId)
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

  const { error } = await supabase.from("responses").insert({
    session_id: sessionId,
    poll_id: validation.pollId,
    option_id: validation.optionId
  });

  if (error) {
    return publicErrorResponse(request, {
      logEvent: "polls.answer.insert_failed",
      error,
      message: "Failed to save your answer.",
      context: { pollId }
    });
  }

  return NextResponse.json({ ok: true });
});
