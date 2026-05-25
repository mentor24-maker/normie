import { createAdminClient } from "@/lib/supabase-admin";

export type GameRewardType = "merch" | "digital" | "access" | "token" | "custom";
export type GameRewardStatus = "active" | "draft" | "archived";
export type GameLevelName =
  | "Grades"
  | "Rank"
  | "Classes"
  | "Stage"
  | "Phase"
  | "Degrees"
  | "Plane"
  | "Echelons";

export type GameLevel = {
  id: string;
  levelName: GameLevelName;
  levelOrder: number;
  gameLevelLevels: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GameLevelTier = {
  id: string;
  level: number;
  tier: string;
  name: string;
  pointsRequired: number;
  sortOrder: number;
  perks: string[];
  createdAt: string;
  updatedAt: string;
};

export type GameReward = {
  id: string;
  name: string;
  description: string;
  rewardType: GameRewardType;
  pointsCost: number;
  inventoryCount: number | null;
  status: GameRewardStatus;
  imageUrl: string;
  redemptionUrl: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GameScoringRule = {
  id: string;
  scoreName: string;
  description: string;
  specificCriteria: string;
  points: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type GameLevelTierRow = {
  id: string;
  level: number;
  tier: string;
  name: string;
  points_required: number;
  sort_order: number;
  perks: unknown;
  created_at: string;
  updated_at: string;
};

type GameLevelRow = {
  id: string;
  level_name: string;
  level_order: number;
  game_level_levels: unknown;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type GameRewardRow = {
  id: string;
  name: string;
  description: string | null;
  reward_type: string | null;
  points_cost: number | null;
  inventory_count: number | null;
  status: string | null;
  image_url: string | null;
  redemption_url: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type GameScoringRuleRow = {
  id: string;
  score_name: string;
  description: string | null;
  specific_criteria: string | null;
  points: number | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export const GAME_REWARD_TYPES: GameRewardType[] = ["merch", "digital", "access", "token", "custom"];
export const GAME_REWARD_STATUSES: GameRewardStatus[] = ["active", "draft", "archived"];
export const GAME_LEVEL_NAMES: GameLevelName[] = [
  "Grades",
  "Rank",
  "Classes",
  "Stage",
  "Phase",
  "Degrees",
  "Plane",
  "Echelons"
];

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeRewardType(value: unknown): GameRewardType {
  const rewardType = String(value ?? "").trim();
  return GAME_REWARD_TYPES.includes(rewardType as GameRewardType) ? (rewardType as GameRewardType) : "custom";
}

function normalizeRewardStatus(value: unknown): GameRewardStatus {
  const status = String(value ?? "").trim();
  return GAME_REWARD_STATUSES.includes(status as GameRewardStatus) ? (status as GameRewardStatus) : "draft";
}

function normalizeLevelName(value: unknown): GameLevelName {
  const levelName = String(value ?? "").trim();
  return GAME_LEVEL_NAMES.includes(levelName as GameLevelName) ? (levelName as GameLevelName) : "Rank";
}

export function gameLevelToClient(row: GameLevelRow): GameLevel {
  return {
    id: row.id,
    levelName: normalizeLevelName(row.level_name),
    levelOrder: row.level_order,
    gameLevelLevels: toStringArray(row.game_level_levels),
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function gameLevelTierToClient(row: GameLevelTierRow): GameLevelTier {
  return {
    id: row.id,
    level: row.level,
    tier: row.tier,
    name: row.name,
    pointsRequired: row.points_required,
    sortOrder: row.sort_order,
    perks: toStringArray(row.perks),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function gameRewardToClient(row: GameRewardRow): GameReward {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    rewardType: normalizeRewardType(row.reward_type),
    pointsCost: row.points_cost ?? 0,
    inventoryCount: row.inventory_count,
    status: normalizeRewardStatus(row.status),
    imageUrl: row.image_url ?? "",
    redemptionUrl: row.redemption_url ?? "",
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function gameScoringRuleToClient(row: GameScoringRuleRow): GameScoringRule {
  return {
    id: row.id,
    scoreName: row.score_name,
    description: row.description ?? "",
    specificCriteria: row.specific_criteria ?? "",
    points: row.points ?? 0,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getAdminGameSnapshot() {
  const supabase = createAdminClient();
  const [gameLevelsResult, levelTiersResult, rewardsResult, scoringRulesResult] = await Promise.all([
    supabase
      .from("game_levels")
      .select("id, level_name, level_order, game_level_levels, metadata, created_at, updated_at")
      .order("level_order", { ascending: true }),
    supabase
      .from("game_level_tiers")
      .select("id, level, tier, name, points_required, sort_order, perks, created_at, updated_at")
      .order("level", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("game_rewards")
      .select(
        "id, name, description, reward_type, points_cost, inventory_count, status, image_url, redemption_url, metadata, created_at, updated_at"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("game_scoring")
      .select("id, score_name, description, specific_criteria, points, metadata, created_at, updated_at")
      .order("updated_at", { ascending: false })
  ]);

  if (gameLevelsResult.error) {
    throw new Error(
      gameLevelsResult.error.message.includes("game_levels")
        ? "Missing game_levels table. Apply migration 022_game_levels.sql."
        : gameLevelsResult.error.message
    );
  }

  if (levelTiersResult.error) {
    throw new Error(
      levelTiersResult.error.message.includes("game_level_tiers")
        ? "Missing game_level_tiers table. Apply migration 020_game_management.sql."
        : levelTiersResult.error.message
    );
  }

  if (rewardsResult.error) {
    throw new Error(
      rewardsResult.error.message.includes("game_rewards")
        ? "Missing game_rewards table. Apply migration 020_game_management.sql."
        : rewardsResult.error.message
    );
  }

  if (scoringRulesResult.error) {
    throw new Error(
      scoringRulesResult.error.message.includes("game_scoring")
        ? "Missing game_scoring table. Apply migration 021_game_scoring.sql."
        : scoringRulesResult.error.message
    );
  }

  return {
    gameLevels: ((gameLevelsResult.data ?? []) as GameLevelRow[]).map(gameLevelToClient),
    levelTiers: ((levelTiersResult.data ?? []) as GameLevelTierRow[]).map(gameLevelTierToClient),
    rewards: ((rewardsResult.data ?? []) as GameRewardRow[]).map(gameRewardToClient),
    scoringRules: ((scoringRulesResult.data ?? []) as GameScoringRuleRow[]).map(gameScoringRuleToClient)
  };
}
