import { createAdminClient } from "@/lib/supabase-admin";
import { countProgressPolls, isProgressPollResponse, sumPointsEarned } from "@/lib/player-poll-stats";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export type PollResponseScoreRow = {
  poll_id: string;
  tokens_earned?: number | null;
  is_skipped?: boolean | null;
};

export type PollReactionScoreRow = {
  poll_id: string;
  tokens_earned?: number | null;
};

/** Polls that still exist and are playable on the public site. */
export async function fetchCountablePollIds(supabase: AdminSupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("polls")
    .select("id")
    .eq("is_published", true)
    .eq("is_hidden", false);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => String(row.id ?? "").trim()).filter(Boolean));
}

export function filterResponsesToCountablePolls<T extends PollResponseScoreRow>(
  responses: T[],
  countablePollIds: ReadonlySet<string>
): T[] {
  return responses.filter((response) => countablePollIds.has(response.poll_id));
}

export function filterReactionsToCountablePolls<T extends PollReactionScoreRow>(
  reactions: T[],
  countablePollIds: ReadonlySet<string>
): T[] {
  return reactions.filter((reaction) => countablePollIds.has(reaction.poll_id));
}

export function sumCountableResponsePoints(responses: PollResponseScoreRow[]): number {
  return sumPointsEarned(responses);
}

export function countCountableProgressPolls(responses: PollResponseScoreRow[]): number {
  return countProgressPolls(responses);
}

export function sumCountableReactionPoints(reactions: PollReactionScoreRow[]): number {
  return sumPointsEarned(reactions);
}

export function isCountableProgressResponse(
  row: PollResponseScoreRow,
  countablePollIds: ReadonlySet<string>
): boolean {
  return countablePollIds.has(row.poll_id) && isProgressPollResponse(row);
}
