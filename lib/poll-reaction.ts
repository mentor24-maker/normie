import { createAdminClient } from "@/lib/supabase-admin";
import {
  getUnlockedFeatureKeys,
  POLL_LIKE_DISLIKE_FEATURE_KEY,
  type FeatureRewardRow,
  type ProgressiveFeatureRow
} from "@/lib/player-unlocked-features";
import {
  POLL_DISLIKE_SCORE_NAME,
  POLL_LIKE_SCORE_NAME,
  getScoringRulePointsByName,
  DEFAULT_POLL_REACTION_POINTS
} from "@/lib/game-scoring-points";
import { countPlayerProgressPollsFromDb } from "@/lib/player-poll-stats";

export type PollReactionKind = "like" | "dislike";

export const POLL_REACTION_KINDS: PollReactionKind[] = ["like", "dislike"];

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export function isPollReactionKind(value: unknown): value is PollReactionKind {
  return value === "like" || value === "dislike";
}

export function scoreNameForPollReaction(reaction: PollReactionKind): string {
  return reaction === "like" ? POLL_LIKE_SCORE_NAME : POLL_DISLIKE_SCORE_NAME;
}

export async function loadPollLikeDislikeEligibility(playerId: string): Promise<boolean> {
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

  const pollsTaken = progressPolls;
  const unlocked = getUnlockedFeatureKeys(
    pollsTaken,
    (rewards ?? []) as FeatureRewardRow[],
    (features ?? []) as ProgressiveFeatureRow[]
  );

  return unlocked.includes(POLL_LIKE_DISLIKE_FEATURE_KEY);
}

export async function playerHasAnsweredPoll(
  supabase: AdminSupabaseClient,
  playerId: string,
  pollId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("poll_response")
    .select("id")
    .eq("user_id", playerId)
    .eq("poll_id", pollId)
    .or("is_skipped.is.null,is_skipped.eq.false")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function loadPlayerPollReaction(
  supabase: AdminSupabaseClient,
  playerId: string,
  pollId: string
): Promise<PollReactionKind | null> {
  const { data, error } = await supabase
    .from("poll_reaction")
    .select("reaction")
    .eq("user_id", playerId)
    .eq("poll_id", pollId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("poll_reaction")) {
      return null;
    }

    throw error;
  }

  return isPollReactionKind(data?.reaction) ? data.reaction : null;
}

export async function resolvePollReactionPoints(
  supabase: AdminSupabaseClient,
  reaction: PollReactionKind
): Promise<number> {
  return getScoringRulePointsByName(supabase, scoreNameForPollReaction(reaction), DEFAULT_POLL_REACTION_POINTS);
}

export async function sumPlayerReactionPointsFromDb(
  supabase: AdminSupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase.from("poll_reaction").select("tokens_earned").eq("user_id", userId);

  if (error) {
    if (error.message.includes("poll_reaction")) {
      return 0;
    }

    throw error;
  }

  return (data ?? []).reduce<number>((total, row) => total + Math.max(0, Number(row.tokens_earned ?? 0)), 0);
}

export async function fetchReactionPointsByUserId(
  supabase: AdminSupabaseClient
): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("poll_reaction").select("user_id, tokens_earned");

  if (error) {
    if (error.message.includes("poll_reaction")) {
      return new Map();
    }

    throw error;
  }

  const totals = new Map<string, number>();

  for (const row of data ?? []) {
    const userId = String(row.user_id ?? "").trim();

    if (!userId) {
      continue;
    }

    totals.set(userId, (totals.get(userId) ?? 0) + Math.max(0, Number(row.tokens_earned ?? 0)));
  }

  return totals;
}
