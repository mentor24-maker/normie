import {
  buildSurveyInterstitialClient,
  readSurveyConfigFromMetadata,
  type SurveyInterstitialClient
} from "@/lib/game-interstitial-survey";
import { createAdminClient } from "@/lib/supabase-admin";

type GameInterstitialRow = {
  id: string;
  name: string;
  interstitial_type: string | null;
  display_order: number | null;
  status: string | null;
  metadata: unknown;
};

type SurveyInterstitialLookup = {
  sessionId: string;
  userId: string | null;
  progressPollCount: number;
  skipForStartPollPreview: boolean;
};

export async function loadCompletedSurveyInterstitialIds({
  sessionId,
  userId
}: {
  sessionId: string;
  userId: string | null;
}): Promise<Set<string>> {
  const supabase = createAdminClient();
  let query = supabase.from("game_interstitial_responses").select("interstitial_id");

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("session_id", sessionId).is("user_id", null);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("game_interstitial_responses")) {
      return new Set();
    }

    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => String(row.interstitial_id ?? "")).filter(Boolean));
}

export async function resolveSurveyInterstitialForSession(
  lookup: SurveyInterstitialLookup
): Promise<SurveyInterstitialClient | null> {
  if (lookup.skipForStartPollPreview || lookup.progressPollCount < 1) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_interstitials")
    .select("id, name, interstitial_type, display_order, status, metadata")
    .eq("status", "active")
    .eq("interstitial_type", "survey")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (error.message.includes("game_interstitials")) {
      return null;
    }

    throw new Error(error.message);
  }

  const activeSurveys = ((data ?? []) as GameInterstitialRow[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      metadata:
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
    }))
    .filter((row) => {
      const config = readSurveyConfigFromMetadata(row.metadata);
      return (
        lookup.progressPollCount % config.showEveryPolls === 0 &&
        config.questions.length > 0
      );
    });

  if (activeSurveys.length === 0) {
    return null;
  }

  const completedIds = await loadCompletedSurveyInterstitialIds({
    sessionId: lookup.sessionId,
    userId: lookup.userId
  });

  const nextSurvey = activeSurveys.find((survey) => !completedIds.has(survey.id));

  if (!nextSurvey) {
    return null;
  }

  return buildSurveyInterstitialClient(nextSurvey);
}
