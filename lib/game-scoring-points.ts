import type { createAdminClient } from "@/lib/supabase-admin";

export const SKIP_QUESTION_SCORE_NAME = "Skip Question";
export const DEFAULT_POLL_ANSWER_SCORE_NAME = "Poll answer";

export async function getScoringRulePointsByName(
  supabase: ReturnType<typeof createAdminClient>,
  scoreName: string,
  fallback: number
): Promise<number> {
  const { data, error } = await supabase
    .from("game_scoring")
    .select("points")
    .eq("score_name", scoreName)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const points = Number.parseInt(String(data.points ?? ""), 10);
  return Number.isFinite(points) && points >= 0 ? points : fallback;
}
