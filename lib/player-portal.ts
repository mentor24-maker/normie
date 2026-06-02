import type { GameAudience } from "@/lib/game-audience";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import {
  ACTIVE_GAME_LEVEL_EVENTS_SELECT,
  buildLevelEventsFromRows,
  type GameLevelEventRow
} from "@/lib/game-level-events";
import { countProgressPolls, isProgressPollResponse, sumPointsEarned } from "@/lib/player-poll-stats";
import { createAdminClient } from "./supabase-admin";
import type { AuthorizedPlayer } from "./player-auth";
import type { BuilderTemplateModule } from "./builder-template";

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
  shareProfile: boolean;
  answersCount: number;
  tokensEarned: number;
};

export type PlayerPortalRewardVisual = {
  visualType: string;
  visualColor: string;
  visualSize: string;
  visualBorderColor: string;
  visualBorderWidth: string;
  visualSymbolUrl: string;
};

export type PlayerPortalRewardTrack = {
  levelName: string;
  sublevelName: string;
  currentGrade: number;
  currentLevel: number;
  pollsPerLevel: number;
  levelsPerGrade: number;
  completedGrades: number;
  totalSlots: number;
  earnedSlots: number;
  isComplete: boolean;
  completedLevelRewards: number;
  completedGradeCoins: PlayerPortalRewardVisual[];
  completedLevelRewardsInGrade: PlayerPortalRewardVisual[];
  /** @deprecated Use completedLevelRewardsInGrade */
  completedRewards: PlayerPortalRewardVisual[];
  pollReward: PlayerPortalRewardVisual;
  levelReward: PlayerPortalRewardVisual;
};

export type PlayerPortalLevelEvent = {
  eventName: string;
  levelName: string;
  sublevelName: string;
  moduleId: string;
  moduleName: string;
  moduleType: string;
  moduleSettings: Record<string, string>;
  gameModule: BuilderTemplateModule | null;
  trigger: string;
  audience: GameAudience;
  metadata: Record<string, unknown>;
};

export type PlayerPortalSnapshot = {
  player: { id: string; email: string; fullName: string; handle: string };
  answers: PlayerAnswer[];
  tokensEarned: number;
  pollsTaken: number;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  rewardTrack: PlayerPortalRewardTrack;
  levelEvents: PlayerPortalLevelEvent[];
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
  is_skipped: boolean | null;
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
  is_skipped: boolean | null;
  created_at: string | null;
};

type ProfileRelation = {
  id: string;
  full_name: string | null;
  handle: string | null;
  share_profile: boolean | null;
};

type GameRewardRow = {
  name: string | null;
  reward_order: number | null;
  points_cost: number | null;
  metadata: unknown;
  updated_at: string | null;
};

export const PLAYER_POLLS_PER_LEVEL = 10;
/** 10 levels per grade × 10 polls per level = 100 polls to graduate a grade. */
export const PLAYER_LEVELS_PER_GRADE = 10;
export const PLAYER_POLLS_PER_GRADE = PLAYER_POLLS_PER_LEVEL * PLAYER_LEVELS_PER_GRADE;
const DEFAULT_POLL_REWARD_VISUAL: PlayerPortalRewardVisual = {
  visualType: "coin",
  visualColor: "#d8212d",
  visualSize: "10px",
  visualBorderColor: "",
  visualBorderWidth: "",
  visualSymbolUrl: ""
};
const DEFAULT_LEVEL_REWARD_VISUAL: PlayerPortalRewardVisual = {
  visualType: "coin",
  visualColor: "#d8212d",
  visualSize: "42px",
  visualBorderColor: "",
  visualBorderWidth: "",
  visualSymbolUrl: ""
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

function toStringRecord(value: unknown): Record<string, string> {
  const record = toRecord(value);

  return Object.fromEntries(
    Object.entries(record).map(([key, recordValue]) => [key, String(recordValue ?? "")])
  );
}

function textValue(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getRewardVisualSource(metadata: Record<string, unknown>, key: "pollReward" | "levelReward") {
  const nested = toRecord(metadata[key]);
  const hasNestedVisual =
    Boolean(textValue(nested.visualColor, "")) ||
    Boolean(textValue(nested.visualSize, "")) ||
    Boolean(textValue(nested.visualType, ""));

  if (hasNestedVisual) {
    return nested;
  }

  return key === "levelReward" ? metadata : nested;
}

function parseVisualSizePx(value: string) {
  const parsed = Number.parseFloat(String(value).replace(/px$/i, "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function buildRewardVisual(
  metadata: Record<string, unknown>,
  key: "pollReward" | "levelReward",
  fallback: PlayerPortalRewardVisual
): PlayerPortalRewardVisual {
  const reward = getRewardVisualSource(metadata, key);

  return {
    visualType: textValue(reward.visualType, fallback.visualType),
    visualColor: normalizeBuilderHexColor(textValue(reward.visualColor, fallback.visualColor), fallback.visualColor),
    visualSize: textValue(reward.visualSize, fallback.visualSize),
    visualBorderColor: normalizeBuilderHexColor(
      textValue(reward.visualBorderColor, fallback.visualBorderColor),
      fallback.visualBorderColor
    ),
    visualBorderWidth: textValue(reward.visualBorderWidth, fallback.visualBorderWidth),
    visualSymbolUrl: textValue(reward.visualSymbolUrl, fallback.visualSymbolUrl)
  };
}

function buildGradeCoinVisual(
  sourceGradeRewards: GameRewardRow[],
  levelTier: number,
  fallbackReward: GameRewardRow | null
): PlayerPortalRewardVisual {
  const sourceReward = rewardAtLevelTier(sourceGradeRewards, levelTier) ?? fallbackReward;
  const sourceMetadata = sourceReward ? toRecord(sourceReward.metadata) : {};
  return buildRewardVisual(sourceMetadata, "levelReward", DEFAULT_LEVEL_REWARD_VISUAL);
}

function rewardProgressionOrder(reward: GameRewardRow, index: number) {
  if (typeof reward.reward_order === "number" && Number.isFinite(reward.reward_order)) {
    return reward.reward_order;
  }

  const metadata = toRecord(reward.metadata);
  const explicitOrder = Number.parseInt(
    String(
      metadata.levelOrder ??
        metadata.rewardOrder ??
        metadata.progressionOrder ??
        metadata.achievementOrder ??
        ""
    ),
    10
  );

  if (Number.isFinite(explicitOrder)) {
    return explicitOrder;
  }

  const nameMatch = String(reward.name ?? "").match(/\blevel\s*(\d+)\b/i);

  if (nameMatch) {
    return Number.parseInt(nameMatch[1], 10);
  }

  return index + 1;
}

function getRewardTierValue(metadata: Record<string, unknown>, key: "levelTier" | "gradeTier" | "classTier") {
  const parsed = Number.parseInt(String(metadata[key] ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getRewardsForGrade(rewards: GameRewardRow[], gradeTier: number) {
  return rewards
    .filter((reward) => {
      const metadata = toRecord(reward.metadata);
      return getRewardTierValue(metadata, "gradeTier") === gradeTier && getRewardTierValue(metadata, "classTier") === 1;
    })
    .map((reward, index) => {
      const metadata = toRecord(reward.metadata);
      const levelTier = getRewardTierValue(metadata, "levelTier");
      return { reward, order: levelTier || rewardProgressionOrder(reward, index) };
    })
    .sort((left, right) => left.order - right.order || String(left.reward.name ?? "").localeCompare(String(right.reward.name ?? "")))
    .map((item) => item.reward);
}

function rewardAtLevelTier(rewards: GameRewardRow[], levelTier: number) {
  if (!rewards.length) {
    return null;
  }

  const exactMatch = rewards.find((reward) => getRewardTierValue(toRecord(reward.metadata), "levelTier") === levelTier);

  if (exactMatch) {
    return exactMatch;
  }

  return rewards[Math.min(Math.max(levelTier, 1), rewards.length) - 1] ?? rewards[rewards.length - 1] ?? null;
}

function gradeGraduationReward(gradeRewards: GameRewardRow[]) {
  return (
    rewardAtLevelTier(gradeRewards, PLAYER_LEVELS_PER_GRADE) ??
    gradeRewards[gradeRewards.length - 1] ??
    null
  );
}

export function buildRewardTrack(rewards: GameRewardRow[], pollsTaken: number): PlayerPortalRewardTrack {
  const normalizedPollsTaken = Math.max(pollsTaken, 0);
  const completedGrades = Math.floor(normalizedPollsTaken / PLAYER_POLLS_PER_GRADE);
  const pollsInCurrentGrade = normalizedPollsTaken % PLAYER_POLLS_PER_GRADE;
  const completedLevelsInCurrentGrade = Math.min(
    PLAYER_LEVELS_PER_GRADE,
    Math.floor(pollsInCurrentGrade / PLAYER_POLLS_PER_LEVEL)
  );
  const earnedSlots = pollsInCurrentGrade % PLAYER_POLLS_PER_LEVEL;
  const currentGrade = completedGrades + 1;
  const currentLevel = Math.min(PLAYER_LEVELS_PER_GRADE, completedLevelsInCurrentGrade + 1);
  const completedLevelRewards = Math.floor(normalizedPollsTaken / PLAYER_POLLS_PER_LEVEL);
  const currentGradeRewards = getRewardsForGrade(rewards, currentGrade);
  const previousGradeRewards = getRewardsForGrade(rewards, Math.max(1, currentGrade - 1));
  const previousGradeGraduationReward = gradeGraduationReward(previousGradeRewards);
  const activeProgressionReward = rewardAtLevelTier(currentGradeRewards, currentLevel);
  const activeMetadata = toRecord(activeProgressionReward?.metadata);

  const completedGradeCoins = Array.from({ length: completedGrades }, (_, index) => {
    const levelTier = index + 1;
    return buildGradeCoinVisual(previousGradeRewards, levelTier, previousGradeGraduationReward);
  });

  const completedLevelRewardsInGrade = Array.from({ length: completedLevelsInCurrentGrade }, (_, index) => {
    const levelTier = index + 1;
    const completedReward = rewardAtLevelTier(currentGradeRewards, levelTier);

    return completedReward
      ? buildRewardVisual(toRecord(completedReward.metadata), "levelReward", DEFAULT_LEVEL_REWARD_VISUAL)
      : DEFAULT_LEVEL_REWARD_VISUAL;
  });

  return {
    levelName: "Grade",
    sublevelName: String(currentGrade),
    currentGrade,
    currentLevel,
    pollsPerLevel: PLAYER_POLLS_PER_LEVEL,
    levelsPerGrade: PLAYER_LEVELS_PER_GRADE,
    completedGrades,
    totalSlots: PLAYER_POLLS_PER_LEVEL,
    earnedSlots,
    isComplete: normalizedPollsTaken > 0 && earnedSlots === 0,
    completedLevelRewards,
    completedGradeCoins,
    completedLevelRewardsInGrade,
    completedRewards: completedLevelRewardsInGrade,
    pollReward: activeProgressionReward
      ? buildRewardVisual(activeMetadata, "pollReward", DEFAULT_POLL_REWARD_VISUAL)
      : DEFAULT_POLL_REWARD_VISUAL,
    levelReward: activeProgressionReward
      ? buildRewardVisual(activeMetadata, "levelReward", DEFAULT_LEVEL_REWARD_VISUAL)
      : DEFAULT_LEVEL_REWARD_VISUAL
  };
}

export async function getPlayerPortalSnapshot(player: AuthorizedPlayer): Promise<PlayerPortalSnapshot> {
  const supabase = createAdminClient();
  const [
    { data: responseRows, error: responsesError },
    { data: leaderboardRows, error: leaderboardError },
    { data: rewardRows, error: rewardsError },
    { data: levelEventRows, error: levelEventsError }
  ] =
    await Promise.all([
      supabase
        .from("poll_response")
        .select(
          "id, poll_id, option_id, user_id, tokens_earned, is_skipped, created_at, polls(question, category, poll_options(id, label, sort_order))"
        )
        .eq("user_id", player.authUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("poll_response")
        .select("user_id, tokens_earned, is_skipped, created_at")
        .not("user_id", "is", null),
      supabase
        .from("game_rewards")
        .select("name, reward_order, points_cost, metadata, updated_at")
        .eq("status", "active"),
      supabase
        .from("game_level_events")
        .select(ACTIVE_GAME_LEVEL_EVENTS_SELECT)
        .eq("is_active", true)
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

  if (
    levelEventsError &&
    !levelEventsError.message.includes("game_level_events") &&
    !levelEventsError.message.includes("schema cache")
  ) {
    throw new Error(levelEventsError.message);
  }

  const responseRowsTyped = (responseRows ?? []) as unknown as ResponseRow[];
  const answers: PlayerAnswer[] = responseRowsTyped.map((row) => {
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
      if (isProgressPollResponse(row)) {
        existing.answersCount += 1;
      }
      existing.tokensEarned += row.tokens_earned ?? 0;
      existing.firstAnsweredAt =
        createdAt && (!existing.firstAnsweredAt || createdAt < existing.firstAnsweredAt)
          ? createdAt
          : existing.firstAnsweredAt;
    } else {
      leaderboardGroups.set(row.user_id, {
        playerId: row.user_id,
        answersCount: isProgressPollResponse(row) ? 1 : 0,
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
    ? await supabase
        .from("player_profiles")
        .select("id, full_name, handle, share_profile")
        .in("id", leaderboardPlayerIds)
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
      shareProfile: Boolean(profile?.share_profile),
      answersCount: row.answersCount,
      tokensEarned: row.tokensEarned
    };
  });

  const playerRank = leaderboard.find((entry) => entry.playerId === player.authUser.id)?.rank ?? null;
  const tokensEarned = sumPointsEarned(responseRowsTyped);
  const pollsTaken = countProgressPolls(responseRowsTyped);

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
    rewardTrack: buildRewardTrack((rewardRows ?? []) as unknown as GameRewardRow[], pollsTaken),
    levelEvents: levelEventsError
      ? []
      : buildLevelEventsFromRows((levelEventRows ?? []) as unknown as GameLevelEventRow[])
  };
}
