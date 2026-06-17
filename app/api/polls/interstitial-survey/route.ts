import { cookies } from "next/headers";
import { validateSurveyAnswers, readSurveyConfigFromMetadata } from "@/lib/game-interstitial-survey";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { jsonWithPollSession } from "@/lib/poll-session-response";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";

export const POST = withObservedRoute("polls.interstitial_survey", async (request) => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(POLL_SESSION_COOKIE)?.value ?? crypto.randomUUID();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  let body: { interstitialId?: unknown; answers?: unknown };

  try {
    body = (await request.json()) as { interstitialId?: unknown; answers?: unknown };
  } catch {
    return jsonWithPollSession({ error: "Invalid request body." }, sessionId, { status: 400 });
  }

  const interstitialId = String(body.interstitialId ?? "").trim();

  if (!interstitialId) {
    return jsonWithPollSession({ error: "Interstitial id is required." }, sessionId, { status: 400 });
  }

  const answers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, string>)
      : {};

  const supabase = createAdminClient();
  const { data: interstitial, error: interstitialError } = await supabase
    .from("game_interstitials")
    .select("id, interstitial_type, status, metadata")
    .eq("id", interstitialId)
    .maybeSingle();

  if (interstitialError) {
    return publicErrorResponse(request, {
      logEvent: "polls.interstitial_survey.load_failed",
      error: interstitialError,
      message: "Failed to load survey."
    });
  }

  if (!interstitial || interstitial.interstitial_type !== "survey" || interstitial.status !== "active") {
    return jsonWithPollSession({ error: "Survey is not available." }, sessionId, { status: 404 });
  }

  const metadata =
    interstitial.metadata && typeof interstitial.metadata === "object" && !Array.isArray(interstitial.metadata)
      ? (interstitial.metadata as Record<string, unknown>)
      : {};
  const survey = readSurveyConfigFromMetadata(metadata);
  const validation = validateSurveyAnswers(survey.questions, answers);

  if (!validation.ok) {
    return jsonWithPollSession({ error: validation.error }, sessionId, { status: 400 });
  }

  let existingQuery = supabase
    .from("game_interstitial_responses")
    .select("id")
    .eq("interstitial_id", interstitialId)
    .limit(1);

  if (player) {
    existingQuery = existingQuery.eq("user_id", player.authUser.id);
  } else {
    existingQuery = existingQuery.eq("session_id", sessionId).is("user_id", null);
  }

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    return publicErrorResponse(request, {
      logEvent: "polls.interstitial_survey.duplicate_check_failed",
      error: existingError,
      message: "Failed to save survey response."
    });
  }

  if (existing) {
    return jsonWithPollSession({ ok: true, duplicate: true }, sessionId);
  }

  const { error: insertError } = await supabase.from("game_interstitial_responses").insert({
    interstitial_id: interstitialId,
    user_id: player?.authUser.id ?? null,
    session_id: sessionId,
    answers: validation.answers
  });

  if (insertError) {
    return publicErrorResponse(request, {
      logEvent: "polls.interstitial_survey.insert_failed",
      error: insertError,
      message: "Failed to save survey response."
    });
  }

  return jsonWithPollSession({ ok: true }, sessionId);
});
