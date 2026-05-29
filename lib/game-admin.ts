import { createAdminClient } from "@/lib/supabase-admin";

export type GameRewardType = "merch" | "digital" | "access" | "feature" | "token" | "custom" | "badge";
export type GameRewardStatus = "active" | "draft" | "archived";
export type GameLevelName =
  | "Level"
  | "Grade"
  | "Class"
  | "Stage"
  | "Phase"
  | "Degree"
  | "Plane"
  | "Echelon"
  | "Tier";

export type GameLevel = {
  id: string;
  levelName: GameLevelName;
  levelOrder: number;
  sublevels: GameSublevel[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GameSublevel = {
  name: string;
  order: number;
  backgroundColor?: string;
  color?: string;
  pollReward?: Record<string, unknown>;
  style?: Record<string, unknown>;
  trackReward?: Record<string, unknown>;
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
  rewardOrder: number;
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

export type GameLevelUpCriterion = {
  scoringRuleId: string;
  requiredCount: number;
  notes: string;
};

export type GameLevelUpRule = {
  id: string;
  levelName: GameLevelName;
  sublevelName: string;
  criteria: GameLevelUpCriterion[];
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GameProgressiveFeature = {
  id: string;
  featureKey: string;
  name: string;
  description: string;
  unlockLevelName: GameLevelName;
  unlockSublevelName: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GameEventModule = {
  id: string;
  name: string;
  moduleType: string;
  trigger: string;
  settings: Record<string, string>;
};

export type GameLevelEvent = {
  id: string;
  eventName: string;
  levelName: GameLevelName;
  sublevelName: string;
  moduleId: string;
  moduleName: string;
  trigger: string;
  isActive: boolean;
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
  reward_order: number | null;
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

type GameLevelUpRuleRow = {
  id: string;
  level_name: string;
  sublevel_name: string;
  criteria: unknown;
  is_active: boolean | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type GameProgressiveFeatureRow = {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  unlock_level_name: string;
  unlock_sublevel_name: string | null;
  is_active: boolean | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type GameLevelEventRow = {
  id: string;
  event_name: string;
  level_name: string;
  sublevel_name: string | null;
  module_id: string | null;
  trigger: string | null;
  is_active: boolean | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  builder_cell_modules?: {
    name?: string | null;
  } | Array<{
    name?: string | null;
  }> | null;
};

type GameEventModuleRow = {
  id: string;
  name: string;
  module_class?: string | null;
  modules: unknown;
};

export const GAME_REWARD_TYPES: GameRewardType[] = ["badge", "digital", "access", "feature", "merch", "token", "custom"];
export const GAME_REWARD_STATUSES: GameRewardStatus[] = ["active", "draft", "archived"];
export const GAME_LEVEL_NAMES: GameLevelName[] = [
  "Level",
  "Grade",
  "Class",
  "Stage",
  "Phase",
  "Degree",
  "Plane",
  "Echelon",
  "Tier"
];

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toGameSublevels(value: unknown): GameSublevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): GameSublevel | null => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const name = String(record.name ?? "").trim();
        const order = Number.parseInt(String(record.order ?? index + 1), 10);

        return name
          ? {
              name,
              order: Number.isFinite(order) ? Math.min(Math.max(order, 1), 1000) : index + 1,
              backgroundColor:
                typeof record.backgroundColor === "string" && record.backgroundColor.trim()
                  ? record.backgroundColor.trim()
                  : undefined,
              color: typeof record.color === "string" && record.color.trim() ? record.color.trim() : undefined,
              pollReward: toRecord(record.pollReward),
              style: toRecord(record.style),
              trackReward: toRecord(record.trackReward)
            }
          : null;
      }

      const name = String(item ?? "").trim();

      return name ? { name, order: index + 1 } : null;
    })
    .filter((item): item is GameSublevel => Boolean(item))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toLevelUpCriteria(value: unknown): GameLevelUpCriterion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const scoringRuleId = String(record.scoringRuleId ?? "").trim();
      const requiredCount = Number.parseInt(String(record.requiredCount ?? 1), 10);

      return scoringRuleId
        ? {
            scoringRuleId,
            requiredCount: Number.isFinite(requiredCount) ? Math.max(1, requiredCount) : 1,
            notes: String(record.notes ?? "").trim()
          }
        : null;
    })
    .filter((criterion): criterion is GameLevelUpCriterion => Boolean(criterion));
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
  const normalizedLevelName = (
    {
      Rank: "Level",
      Levels: "Level",
      Grades: "Grade",
      Classes: "Class",
      Degrees: "Degree",
      Echelons: "Echelon",
      Tiers: "Tier"
    } as const
  )[levelName as keyof {
    Rank: "Level";
    Levels: "Level";
    Grades: "Grade";
    Classes: "Class";
    Degrees: "Degree";
    Echelons: "Echelon";
    Tiers: "Tier";
  }] ?? levelName;
  return GAME_LEVEL_NAMES.includes(normalizedLevelName as GameLevelName) ? (normalizedLevelName as GameLevelName) : "Level";
}

export function gameLevelToClient(row: GameLevelRow): GameLevel {
  return {
    id: row.id,
    levelName: normalizeLevelName(row.level_name),
    levelOrder: row.level_order,
    sublevels: toGameSublevels(row.game_level_levels),
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
    rewardOrder: row.reward_order ?? 1,
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

export function gameLevelUpRuleToClient(row: GameLevelUpRuleRow): GameLevelUpRule {
  return {
    id: row.id,
    levelName: normalizeLevelName(row.level_name),
    sublevelName: row.sublevel_name,
    criteria: toLevelUpCriteria(row.criteria),
    isActive: row.is_active ?? true,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function gameProgressiveFeatureToClient(row: GameProgressiveFeatureRow): GameProgressiveFeature {
  return {
    id: row.id,
    featureKey: row.feature_key,
    name: row.name,
    description: row.description ?? "",
    unlockLevelName: normalizeLevelName(row.unlock_level_name),
    unlockSublevelName: row.unlock_sublevel_name ?? "",
    isActive: row.is_active ?? true,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function gameLevelEventToClient(row: GameLevelEventRow): GameLevelEvent {
  const joinedModule = Array.isArray(row.builder_cell_modules)
    ? row.builder_cell_modules[0]
    : row.builder_cell_modules;

  return {
    id: row.id,
    eventName: row.event_name,
    levelName: normalizeLevelName(row.level_name),
    sublevelName: row.sublevel_name ?? "",
    moduleId: row.module_id ?? "",
    moduleName: joinedModule?.name ?? "",
    trigger: row.trigger ?? "game",
    isActive: row.is_active ?? true,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function gameEventModuleToClient(row: GameEventModuleRow): GameEventModule | null {
  if (!Array.isArray(row.modules) || row.modules.length !== 1) {
    return null;
  }

  const savedModule = row.modules[0];
  if (!savedModule || typeof savedModule !== "object" || Array.isArray(savedModule)) {
    return null;
  }

  const record = savedModule as Record<string, unknown>;
  const settings = toRecord(record.settings);
  const stringSettings = Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [key, String(value ?? "")])
  );
  const isConfettiModule =
    record.type === "confetti" ||
    (
      /special effects/i.test(String(row.module_class ?? "")) &&
      /confetti/i.test(`${row.name} ${String(record.name ?? "")}`)
    ) ||
    stringSettings.particleCount !== undefined ||
    stringSettings.spread !== undefined ||
    stringSettings.popVolume !== undefined;

  const moduleType = isConfettiModule ? "confetti" : String(record.type ?? "");

  return {
    id: row.id,
    name: row.name,
    moduleType,
    trigger: String(stringSettings.trigger ?? ""),
    settings: stringSettings
  };
}

export async function getAdminGameSnapshot() {
  const supabase = createAdminClient();
  const [
    gameLevelsResult,
    levelTiersResult,
    rewardsResult,
    scoringRulesResult,
    levelUpRulesResult,
    progressiveFeaturesResult,
    levelEventsResult,
    eventModulesResult
  ] =
    await Promise.all([
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
        "id, name, description, reward_type, reward_order, points_cost, inventory_count, status, image_url, redemption_url, metadata, created_at, updated_at"
      )
      .order("reward_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("game_scoring")
      .select("id, score_name, description, specific_criteria, points, metadata, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("game_level_up_rules")
      .select("id, level_name, sublevel_name, criteria, is_active, metadata, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("game_progressive_features")
      .select("id, feature_key, name, description, unlock_level_name, unlock_sublevel_name, is_active, metadata, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("game_level_events")
      .select("id, event_name, level_name, sublevel_name, module_id, trigger, is_active, metadata, created_at, updated_at, builder_cell_modules(name)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("builder_cell_modules")
      .select("id, name, module_class, modules")
      .order("name", { ascending: true })
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

  if (levelUpRulesResult.error) {
    throw new Error(
      levelUpRulesResult.error.message.includes("game_level_up_rules")
        ? "Missing game_level_up_rules table. Apply migration 024_game_level_up_rules.sql."
        : levelUpRulesResult.error.message
    );
  }

  if (progressiveFeaturesResult.error) {
    throw new Error(
      progressiveFeaturesResult.error.message.includes("game_progressive_features")
        ? "Missing game_progressive_features table. Apply migration 031_game_progressive_features.sql."
        : progressiveFeaturesResult.error.message
    );
  }

  if (levelEventsResult.error) {
    throw new Error(
      levelEventsResult.error.message.includes("game_level_events")
        ? "Missing game_level_events table. Apply migration 032_game_level_events.sql."
        : levelEventsResult.error.message
    );
  }

  if (eventModulesResult.error) {
    throw new Error(eventModulesResult.error.message);
  }

  const eventModules = ((eventModulesResult.data ?? []) as GameEventModuleRow[])
    .map(gameEventModuleToClient)
    .filter((module): module is GameEventModule =>
      module !== null &&
      module.moduleType === "confetti" &&
      module.trigger === "game"
    );
  let levelEvents = ((levelEventsResult.data ?? []) as unknown as GameLevelEventRow[]).map(gameLevelEventToClient);

  if (levelEvents.length === 0 && eventModules.length > 0) {
    const defaultModule =
      eventModules.find((module) => /medium/i.test(module.name)) ??
      eventModules[0];
    const { data: seededEvent } = await supabase
      .from("game_level_events")
      .insert({
        event_name: "Level 1.1 Confetti",
        level_name: "Level",
        sublevel_name: "1",
        module_id: defaultModule.id,
        trigger: "game",
        is_active: true,
        metadata: { eventType: "confetti", seeded: true },
        updated_at: new Date().toISOString()
      })
      .select("id, event_name, level_name, sublevel_name, module_id, trigger, is_active, metadata, created_at, updated_at, builder_cell_modules(name)")
      .single();

    if (seededEvent) {
      levelEvents = [gameLevelEventToClient(seededEvent as unknown as GameLevelEventRow)];
    }
  }

  return {
    gameLevels: ((gameLevelsResult.data ?? []) as GameLevelRow[]).map(gameLevelToClient),
    levelTiers: ((levelTiersResult.data ?? []) as GameLevelTierRow[]).map(gameLevelTierToClient),
    rewards: ((rewardsResult.data ?? []) as GameRewardRow[]).map(gameRewardToClient),
    scoringRules: ((scoringRulesResult.data ?? []) as GameScoringRuleRow[]).map(gameScoringRuleToClient),
    levelUpRules: ((levelUpRulesResult.data ?? []) as GameLevelUpRuleRow[]).map(gameLevelUpRuleToClient),
    progressiveFeatures: ((progressiveFeaturesResult.data ?? []) as GameProgressiveFeatureRow[]).map(gameProgressiveFeatureToClient),
    levelEvents,
    eventModules
  };
}
