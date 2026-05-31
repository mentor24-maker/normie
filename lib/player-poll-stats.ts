import type { createAdminClient } from "@/lib/supabase-admin";

export type PollResponseProgressRow = {
  is_skipped?: boolean | null;
  tokens_earned?: number | null;
};

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

/** Counts only real answers — skipped polls earn points but do not advance badge progression. */
export function isProgressPollResponse(row: PollResponseProgressRow): boolean {
  return row.is_skipped !== true;
}

export function countProgressPolls(rows: PollResponseProgressRow[]): number {
  return rows.filter(isProgressPollResponse).length;
}

export function sumPointsEarned(rows: Array<{ tokens_earned?: number | null }>): number {
  return rows.reduce((total, row) => total + Math.max(0, Number(row.tokens_earned ?? 0)), 0);
}

/** Polls that advance badges, reward track, level-up, and feature unlocks. */
export async function countPlayerProgressPollsFromDb(
  supabase: AdminSupabaseClient,
  playerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("poll_response")
    .select("id", { count: "exact", head: true })
    .eq("user_id", playerId)
    .eq("is_skipped", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/** Progress polls for an anonymous browser session (non-skipped answers only). */
export async function countSessionProgressPollsFromDb(
  supabase: AdminSupabaseClient,
  sessionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("poll_response")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("user_id", null)
    .eq("is_skipped", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}
