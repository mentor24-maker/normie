import { createAdminClient } from "./supabase-admin";
import type { AuthorizedPlayer } from "./player-auth";

export type PlayerPollOption = {
  id: string;
  label: string;
};

export type PlayerAnswer = {
  id: string;
  pollId: string;
  optionId: string;
  question: string;
  answer: string;
  category: string;
  tokensEarned: number;
  answeredAt: string;
  options: PlayerPollOption[];
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  displayName: string;
  handle: string;
  answersCount: number;
  tokensEarned: number;
};

export type PlayerPortalRewardVisual = {
  visualType: string;
  visualColor: string;
  visualSize: string;
  visualBorderColor: string;
  visualBorderWidth: string;
};

export type PlayerPortalRewardTrack = {
  levelName: string;
  sublevelName: string;
  totalSlots: number;
  earnedSlots: number;
  isComplete: boolean;
  pollReward: PlayerPortalRewardVisual;
  levelReward: PlayerPortalRewardVisual;
};

export type PlayerPortalSnapshot = {
  player: { id: string; email: string; fullName: string; handle: string };
  answers: PlayerAnswer[];
  tokensEarned: number;
  pollsTaken: number;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  rewardTrack: PlayerPortalRewardTrack;
};

type PollOptionRow = {
  id: string;
  label: string | null;
  sort_order: number | null;
};

type ResponseRow = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  tokens_earned: number | null;
  created_at: string;
  polls:
    | {
        question: string | null;
        category: string | null;
        poll_options: PollOptionRow[] | PollOptionRow | null;
      }
    | Array<{
        question: string | null;
        category: string | null;
        poll_options: PollOptionRow[] | PollOptionRow | null;
      }>
    | null;
};

type LeaderboardResponseRow = {
  user_id: string | null;
  tokens_earned: number | null;
  created_at: string | null;
};

type ProfileRelation = {
  id: string;
  full_name: string | null;
  handle: string | null;
};

type GameRewardRow = {
  metadata: unknown;
};

const FIRST_GRADE_REWARD_SLOTS = 10;
const DEFAULT_POLL_REWARD_VISUAL: PlayerPortalRewardVisual = {
  visualType: "coin",
  visualColor: "#d8212d",
  visualSize: "10px",
  visualBorderColor: "",
  visualBorderWidth: ""
};
const DEFAULT_LEVEL_REWARD_VISUAL: PlayerPortalRewardVisual = {
  visualType: "coin",
  visualColor: "#d8212d",
  visualSize: "42px",
  visualBorderColor: "",
  visualBorderWidth: ""
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function displayNameForProfile(fullName: string | null | undefined, handle: string | null | undefined) {
  return fullName?.trim() || handle?.trim() || "Normie Player";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildRewardVisual(
  metadata: Record<string, unknown>,
  key: "pollReward" | "levelReward",
  fallback: PlayerPortalRewardVisual
): PlayerPortalRewardVisual {
  const reward = toRecord(metadata[key]);

  return {
    visualType: textValue(reward.visualType, fallback.visualType),
    visualColor: textValue(reward.visualColor, fallback.visualColor),
    visualSize: textValue(reward.visualSize, fallback.visualSize),
    visualBorderColor: textValue(reward.visualBorderColor, fallback.visualBorderColor),
    visualBorderWidth: textValue(reward.visualBorderWidth, fallback.visualBorderWidth)
  };
}

function buildRewardTrack(rewards: GameRewardRow[], pollsTaken: number): PlayerPortalRewardTrack {
  const gradeFirstReward = rewards.find((reward) => {
    const metadata = toRecord(reward.metadata);
    return metadata.achievementLevelName === "Grades" && metadata.achievementSublevelName === "First";
  });
  const metadata = toRecord(gradeFirstReward?.metadata);

  return {
    levelName: "Grades",
    sublevelName: "First",
    totalSlots: FIRST_GRADE_REWARD_SLOTS,
    earnedSlots: Math.min(Math.max(pollsTaken, 0), FIRST_GRADE_REWARD_SLOTS),
    isComplete: pollsTaken >= FIRST_GRADE_REWARD_SLOTS,
    pollReward: gradeFirstReward
      ? buildRewardVisual(metadata, "pollReward", DEFAULT_POLL_REWARD_VISUAL)
      : DEFAULT_POLL_REWARD_VISUAL,
    levelReward: gradeFirstReward
      ? buildRewardVisual(metadata, "levelReward", DEFAULT_LEVEL_REWARD_VISUAL)
      : DEFAULT_LEVEL_REWARD_VISUAL
  };
}

export async function getPlayerPortalSnapshot(player: AuthorizedPlayer): Promise<PlayerPortalSnapshot> {
  const supabase = createAdminClient();
  const [
    { data: responseRows, error: responsesError },
    { data: leaderboardRows, error: leaderboardError },
    { data: rewardRows, error: rewardsError }
  ] =
    await Promise.all([
      supabase
        .from("poll_response")
        .select(
          "id, poll_id, option_id, user_id, tokens_earned, created_at, polls(question, category, poll_options(id, label, sort_order))"
        )
        .eq("user_id", player.authUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("poll_response")
        .select("user_id, tokens_earned, created_at")
        .not("user_id", "is", null),
      supabase
        .from("game_rewards")
        .select("metadata")
        .eq("status", "active")
    ]);

  if (responsesError) {
    throw new Error(responsesError.message);
  }

  if (leaderboardError) {
    throw new Error(leaderboardError.message);
  }

  if (rewardsError) {
    throw new Error(rewardsError.message);
  }

  const answers: PlayerAnswer[] = ((responseRows ?? []) as unknown as ResponseRow[]).map((row) => {
    const poll = firstRelation(row.polls);
    const rawOptions = poll?.poll_options;
    const optionRows = Array.isArray(rawOptions) ? rawOptions : rawOptions ? [rawOptions] : [];
    const options = optionRows
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((option) => ({
        id: option.id,
        label: option.label?.trim() || "Option"
      }));
    const selectedOption = options.find((option) => option.id === row.option_id);

    return {
      id: row.id,
      pollId: row.poll_id,
      optionId: row.option_id,
      question: poll?.question ?? "Untitled poll",
      answer: selectedOption?.label ?? "Unknown answer",
      category: poll?.category ?? "General",
      tokensEarned: row.tokens_earned ?? 0,
      answeredAt: row.created_at,
      options
    };
  });

  const leaderboardGroups = new Map<
    string,
    { playerId: string; answersCount: number; tokensEarned: number; firstAnsweredAt: string }
  >();

  for (const row of (leaderboardRows ?? []) as unknown as LeaderboardResponseRow[]) {
    if (!row.user_id) {
      continue;
    }

    const createdAt = row.created_at ?? "";
    const existing = leaderboardGroups.get(row.user_id);

    if (existing) {
      existing.answersCount += 1;
      existing.tokensEarned += row.tokens_earned ?? 0;
      existing.firstAnsweredAt =
        createdAt && (!existing.firstAnsweredAt || createdAt < existing.firstAnsweredAt)
          ? createdAt
          : existing.firstAnsweredAt;
    } else {
      leaderboardGroups.set(row.user_id, {
        playerId: row.user_id,
        answersCount: 1,
        tokensEarned: row.tokens_earned ?? 0,
        firstAnsweredAt: createdAt
      });
    }
  }

  const leaderboardTotals = [...leaderboardGroups.values()]
    .sort((a, b) => {
      if (b.tokensEarned !== a.tokensEarned) {
        return b.tokensEarned - a.tokensEarned;
      }
      if (b.answersCount !== a.answersCount) {
        return b.answersCount - a.answersCount;
      }
      return a.firstAnsweredAt.localeCompare(b.firstAnsweredAt);
    })
    .slice(0, 25);

  const leaderboardPlayerIds = leaderboardTotals.map((row) => row.playerId);
  const { data: profileRows, error: profilesError } = leaderboardPlayerIds.length
    ? await supabase.from("player_profiles").select("id, full_name, handle").in("id", leaderboardPlayerIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(
    ((profileRows ?? []) as unknown as ProfileRelation[]).map((profile) => [profile.id, profile])
  );

  const leaderboard = leaderboardTotals.map((row, index) => {
    const profile = profilesById.get(row.playerId);

    return {
      rank: index + 1,
      playerId: row.playerId,
      displayName: displayNameForProfile(profile?.full_name, profile?.handle),
      handle: profile?.handle ?? "player",
      answersCount: row.answersCount,
      tokensEarned: row.tokensEarned
    };
  });

  const playerRank = leaderboard.find((entry) => entry.playerId === player.authUser.id)?.rank ?? null;
  const tokensEarned = answers.reduce((total, answer) => total + answer.tokensEarned, 0);
  const pollsTaken = answers.length;

  return {
    player: {
      id: player.authUser.id,
      email: player.authUser.email ?? "",
      fullName: player.profile.full_name ?? "",
      handle: player.profile.handle ?? "player"
    },
    answers,
    tokensEarned,
    pollsTaken,
    leaderboard,
    playerRank,
    rewardTrack: buildRewardTrack((rewardRows ?? []) as unknown as GameRewardRow[], pollsTaken)
  };
}
