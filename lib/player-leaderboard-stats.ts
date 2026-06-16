import { createAdminClient } from "@/lib/supabase-admin";
import { fetchReactionPointsByUserId } from "@/lib/poll-reaction";
import {
  fetchCountablePollIds,
  isCountableProgressResponse,
  type PollResponseScoreRow
} from "@/lib/poll-player-score";
import { POLL_ROWS_PAGE_SIZE } from "@/lib/poll-rows-pagination";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export type LeaderboardAggregateRow = {
  playerId: string;
  answersCount: number;
  tokensEarned: number;
  firstAnsweredAt: string;
};

export type RegisteredPollResponseRow = PollResponseScoreRow & {
  user_id: string | null;
  created_at?: string | null;
};

async function fetchAllRegisteredPollResponses(
  supabase: AdminSupabaseClient
): Promise<RegisteredPollResponseRow[]> {
  const rows: RegisteredPollResponseRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("poll_response")
      .select("user_id, poll_id, tokens_earned, is_skipped, created_at")
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + POLL_ROWS_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as RegisteredPollResponseRow[];
    rows.push(...page);

    if (page.length < POLL_ROWS_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return rows;
}

export function buildLeaderboardGroups(
  responses: RegisteredPollResponseRow[],
  countablePollIds: ReadonlySet<string>,
  reactionPointsByUser: ReadonlyMap<string, number>
): Map<string, LeaderboardAggregateRow> {
  const leaderboardGroups = new Map<string, LeaderboardAggregateRow>();

  for (const row of responses) {
    if (!row.user_id || !countablePollIds.has(row.poll_id)) {
      continue;
    }

    const createdAt = row.created_at ?? "";
    const existing = leaderboardGroups.get(row.user_id);

    if (existing) {
      if (isCountableProgressResponse(row, countablePollIds)) {
        existing.answersCount += 1;
      }
      existing.tokensEarned += row.tokens_earned ?? 0;
      existing.firstAnsweredAt =
        createdAt && (!existing.firstAnsweredAt || createdAt < existing.firstAnsweredAt)
          ? createdAt
          : existing.firstAnsweredAt;
      continue;
    }

    leaderboardGroups.set(row.user_id, {
      playerId: row.user_id,
      answersCount: isCountableProgressResponse(row, countablePollIds) ? 1 : 0,
      tokensEarned: row.tokens_earned ?? 0,
      firstAnsweredAt: createdAt
    });
  }

  for (const [userId, reactionPoints] of reactionPointsByUser) {
    const existing = leaderboardGroups.get(userId);

    if (existing) {
      existing.tokensEarned += reactionPoints;
      continue;
    }

    if (reactionPoints > 0) {
      leaderboardGroups.set(userId, {
        playerId: userId,
        answersCount: 0,
        tokensEarned: reactionPoints,
        firstAnsweredAt: ""
      });
    }
  }

  return leaderboardGroups;
}

export function sortLeaderboardGroups(
  groups: Iterable<LeaderboardAggregateRow>
): LeaderboardAggregateRow[] {
  return [...groups].sort((left, right) => {
    if (right.tokensEarned !== left.tokensEarned) {
      return right.tokensEarned - left.tokensEarned;
    }

    if (right.answersCount !== left.answersCount) {
      return right.answersCount - left.answersCount;
    }

    return left.firstAnsweredAt.localeCompare(right.firstAnsweredAt);
  });
}

export async function loadLeaderboardAggregateMap(
  supabase: AdminSupabaseClient
): Promise<{ groups: Map<string, LeaderboardAggregateRow>; countablePollIds: Set<string> }> {
  const countablePollIds = await fetchCountablePollIds(supabase);
  const [responses, reactionPointsByUser] = await Promise.all([
    fetchAllRegisteredPollResponses(supabase),
    fetchReactionPointsByUserId(supabase, countablePollIds)
  ]);

  return {
    groups: buildLeaderboardGroups(responses, countablePollIds, reactionPointsByUser),
    countablePollIds
  };
}

export async function loadSortedLeaderboardAggregates(
  supabase: AdminSupabaseClient
): Promise<LeaderboardAggregateRow[]> {
  const { groups } = await loadLeaderboardAggregateMap(supabase);
  return sortLeaderboardGroups(groups.values());
}

export function getLeaderboardStatsForPlayer(
  groups: ReadonlyMap<string, LeaderboardAggregateRow>,
  playerId: string
): { pollsTaken: number; tokensEarned: number; playerRank: number | null } {
  const sorted = sortLeaderboardGroups(groups.values());
  const playerIndex = sorted.findIndex((row) => row.playerId === playerId);
  const playerRow = playerIndex >= 0 ? sorted[playerIndex] : null;

  return {
    pollsTaken: playerRow?.answersCount ?? 0,
    tokensEarned: playerRow?.tokensEarned ?? 0,
    playerRank: playerIndex >= 0 ? playerIndex + 1 : null
  };
}
