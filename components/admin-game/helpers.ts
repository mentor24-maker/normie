

import { getGameRewardDiscVisual } from "@/lib/reward-disc-visual";

import type { GameLevel, GameLevelName, GameLevelUpRule, GameLevelEvent, GameEventModule, GameInterstitial, GameInterstitialStatus, GameInterstitialType, GameProgressiveFeature, GameSublevel, GameReward, GameRewardStatus, GameRewardType, GameScoringRule } from "@/lib/game-admin";
import { GAME_INTERSTITIAL_TYPE_LABELS } from "@/lib/game-admin";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { DEFAULT_EVENT_POLLS_PER_LEVEL, progressPollsAtEvent, readEventProgressionFromMetadata } from "@/lib/player-progression-tiers";
import { PLAYER_LEVELS_PER_GRADE } from "@/lib/player-portal";

import { createDefaultSurveyConfig, writeSurveyConfigToMetadata } from "@/lib/game-interstitial-survey";

export type GameSnapshot = {
  gameLevels: GameLevel[];
  eventModules: GameEventModule[];
  levelUpRules: GameLevelUpRule[];
  levelEvents: GameLevelEvent[];
  progressiveFeatures: GameProgressiveFeature[];
  rewards: GameReward[];
  scoringRules: GameScoringRule[];
  interstitials: GameInterstitial[];
};

export type GameLevelDraft = Partial<GameLevel>;
export type LevelUpRuleDraft = Partial<GameLevelUpRule>;
export type LevelEventDraft = Partial<GameLevelEvent> & {
  gradeTier?: number;
  levelTier?: number;
  pollTier?: number;
  pollsPerLevel?: number;
};
export type ProgressiveFeatureDraft = Partial<GameProgressiveFeature>;
export type RewardDraft = Partial<GameReward> & {
  inventoryCountText?: string;
  pollVisualType?: string;
  pollDigitalProduct?: string;
  pollVisualColor?: string;
  pollVisualSize?: string;
  pollVisualBorderColor?: string;
  pollVisualBorderWidth?: string;
  pollVisualSymbolUrl?: string;
  levelVisualType?: string;
  levelDigitalProduct?: string;
  levelVisualColor?: string;
  levelVisualSize?: string;
  levelVisualBorderColor?: string;
  levelVisualBorderWidth?: string;
  levelVisualSymbolUrl?: string;
  achievementLevelName?: GameLevelName;
  achievementSublevelName?: string;
  featureKey?: string;
  levelTier?: number;
  gradeTier?: number;
  classTier?: number;
};
export type ScoringRuleDraft = Partial<GameScoringRule>;
export type InterstitialDraft = Partial<GameInterstitial>;
export type SortDirection = "asc" | "desc";
export type GameSection = "levels" | "scoring" | "level-up" | "redemptions" | "interstitials";
export type GameLevelSortKey = "levelName" | "levelOrder" | "sublevels";
export type RewardSortKey = "name" | "rewardType" | "levelTier" | "gradeTier" | "classTier" | "rewardVisual";
export type ScoringRuleSortKey = "scoreName" | "description" | "specificCriteria" | "points" | "updatedAt";
export type LevelEventSortKey = "eventName" | "milestone" | "poll" | "moduleName" | "status" | "updatedAt";
export type RewardTierType = "levelTier" | "gradeTier" | "classTier";
export type RewardBulkAction = RewardTierType | "pollSize" | "levelSize" | "color";
export type LevelEventModuleCategory = string;

export function isRewardTierBulkAction(action: RewardBulkAction): action is RewardTierType {
  return action === "levelTier" || action === "gradeTier" || action === "classTier";
}

export function buildBulkRewardColorMetadata(reward: GameReward, color: string): Record<string, unknown> {
  const metadata = { ...reward.metadata };

  for (const key of ["pollReward", "levelReward"] as const) {
    const existing =
      metadata[key] && typeof metadata[key] === "object" && !Array.isArray(metadata[key])
        ? { ...(metadata[key] as Record<string, unknown>) }
        : {};

    existing.visualColor = normalizeBuilderHexColor(color, DEFAULT_BADGE_BACKGROUND_COLOR);
    metadata[key] = existing;
  }

  return metadata;
}

export function buildBulkRewardSingleSizeMetadata(
  reward: GameReward,
  target: "pollReward" | "levelReward",
  size: string
): Record<string, unknown> {
  const metadata = { ...reward.metadata };
  const fallback = target === "pollReward" ? "20px" : "42px";
  const existing =
    metadata[target] && typeof metadata[target] === "object" && !Array.isArray(metadata[target])
      ? { ...(metadata[target] as Record<string, unknown>) }
      : {};

  existing.visualSize = size.trim() || fallback;
  metadata[target] = existing;

  return metadata;
}

export function getRewardSaveDiagnosticTone(
  diagnostic: string | null,
  isSaving: boolean
): "processing" | "success" | "error" | null {
  if (!diagnostic) {
    return null;
  }

  if (/failed/i.test(diagnostic)) {
    return "error";
  }

  if (isSaving || diagnostic.endsWith("...")) {
    return "processing";
  }

  return "success";
}

export const DEFAULT_BADGE_BACKGROUND_COLOR = "#d8212d";
export const GAME_LEVEL_NAME_LABELS: Record<string, string> = {
  Level: "Level",
  Grade: "Grade",
  Class: "Class",
  Stage: "Stage",
  Phase: "Phase",
  Degree: "Degree",
  Plane: "Plane",
  Echelon: "Echelon",
  Tier: "Tier",
  Levels: "Level",
  Grades: "Grade",
  Classes: "Class",
  Degrees: "Degree",
  Echelons: "Echelon",
  Tiers: "Tier"
};

export const GAME_LEVEL_TABLE_COLUMNS: Array<{ key: GameLevelSortKey; label: string }> = [
  { key: "levelName", label: "Progression Track" },
  { key: "levelOrder", label: "Order" },
  { key: "sublevels", label: "Sublevels" }
];

export const REWARD_TABLE_COLUMNS: Array<{ key: RewardSortKey; label: string }> = [
  { key: "name", label: "Reward" },
  { key: "rewardType", label: "Type" },
  { key: "levelTier", label: "Level" },
  { key: "gradeTier", label: "Grade" },
  { key: "classTier", label: "Class" },
  { key: "rewardVisual", label: "Reward Disk" }
];
export const REWARD_TABLE_COLUMN_COUNT = REWARD_TABLE_COLUMNS.length + 2;

export const SCORING_TABLE_COLUMNS: Array<{ key: ScoringRuleSortKey; label: string }> = [
  { key: "scoreName", label: "Score Name" },
  { key: "description", label: "Description" },
  { key: "specificCriteria", label: "Specific Criteria" },
  { key: "points", label: "Points" },
  { key: "updatedAt", label: "Updated" }
];

export const LEVEL_EVENT_TABLE_COLUMNS: Array<{ key: LevelEventSortKey; label: string }> = [
  { key: "eventName", label: "Event" },
  { key: "milestone", label: "Milestone" },
  { key: "poll", label: "Poll" },
  { key: "moduleName", label: "Module" },
  { key: "status", label: "Status" },
  { key: "updatedAt", label: "Updated" }
];

export function getEventModuleCategory(module: Pick<GameEventModule, "moduleType" | "moduleClass" | "name"> | undefined): { value: LevelEventModuleCategory; label: string } {
  const moduleType = String(module?.moduleType ?? "").trim();

  if (moduleType === "speech-bubble") {
    return { value: moduleType, label: "Speech Bubble" };
  }

  if (moduleType === "confetti") {
    return { value: moduleType, label: "Effect" };
  }

  if (moduleType === "floating-image") {
    return { value: moduleType, label: "Bouncing Normie" };
  }

  const moduleClass = String(module?.moduleClass ?? "").trim();
  const moduleName = String(module?.name ?? "").trim();
  const fallback = moduleClass || moduleName || moduleType;

  return { value: fallback, label: fallback || "Module category" };
}

export const GAME_SECTION_TILES: Array<{ key: GameSection; label: string; description: string }> = [
  { key: "levels", label: "Progression Tracks", description: "Tracks, sublevels, and order." },
  { key: "scoring", label: "Point Scoring", description: "Ways players earn points." },
  { key: "level-up", label: "Level Up", description: "Graduation rules and criteria." },
  { key: "redemptions", label: "Rewards & Redemptions", description: "Achievement rewards and point claims." },
  { key: "interstitials", label: "Interstitials", description: "Messages between polls in the main panel." }
];

export async function readAdminJson<T extends { error?: string }>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(`${fallbackMessage} ${preview || "The server returned a non-JSON response."}`);
  }

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export function reorderItems<T>(items: T[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}

export function normalizeSublevelOrder(sublevels: GameSublevel[]) {
  return sublevels.map((sublevel, index) => ({ ...sublevel, order: index + 1 }));
}

export function formatGameLevelName(levelName: GameLevelName | string | undefined): string {
  if (!levelName) {
    return "";
  }

  return GAME_LEVEL_NAME_LABELS[levelName] ?? levelName;
}

export function createGameLevelDraft(): GameLevelDraft {
  return {
    levelName: "Level",
    levelOrder: 1,
    sublevels: []
  };
}

export function createLevelUpRuleDraft(gameLevels: GameLevel[] = [], scoringRules: GameScoringRule[] = []): LevelUpRuleDraft {
  const firstLevel = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder)[0];
  const firstSublevel = firstLevel?.sublevels.slice().sort((left, right) => left.order - right.order)[0];
  const firstScoringRule = scoringRules[0];

  return {
    levelName: firstLevel?.levelName ?? "Grade",
    sublevelName: firstSublevel?.name ?? "",
    criteria: firstScoringRule
      ? [
          {
            scoringRuleId: firstScoringRule.id,
            requiredCount: 1,
            notes: ""
          }
        ]
      : [],
    isActive: true
  };
}

export function createProgressiveFeatureDraft(gameLevels: GameLevel[] = []): ProgressiveFeatureDraft {
  const levelTrack = gameLevels.find((gameLevel) => gameLevel.levelName === "Level") ?? gameLevels[0];
  const firstSublevel = levelTrack?.sublevels.slice().sort((left, right) => left.order - right.order)[0];

  return {
    featureKey: "poll_skip",
    name: "Skip Poll",
    description: "Allows qualified players to skip the current poll and move to the next one.",
    unlockLevelName: levelTrack?.levelName ?? "Level",
    unlockSublevelName: firstSublevel?.name ?? "1",
    isActive: true,
    metadata: { uiPlacement: "under_poll_options" }
  };
}

export const LEVEL_TIER_OPTIONS = Array.from({ length: PLAYER_LEVELS_PER_GRADE }, (_, index) => index + 1);

export function applyProgressionToLevelEventDraft(draft: LevelEventDraft): LevelEventDraft {
  const gradeTier = Math.max(1, Number(draft.gradeTier) || 1);
  const levelTier = Math.min(PLAYER_LEVELS_PER_GRADE, Math.max(1, Number(draft.levelTier) || 1));
  const pollsPerLevel = Math.max(1, Number(draft.pollsPerLevel) || DEFAULT_EVENT_POLLS_PER_LEVEL);
  const pollTier = Math.min(pollsPerLevel, Math.max(1, Number(draft.pollTier) || pollsPerLevel));
  const targetProgressPolls = progressPollsAtEvent(gradeTier, levelTier, pollTier, pollsPerLevel);

  return {
    ...draft,
    gradeTier,
    levelTier,
    pollTier,
    pollsPerLevel,
    levelName: "Level",
    sublevelName: String(Math.max(1, Math.ceil(targetProgressPolls / DEFAULT_EVENT_POLLS_PER_LEVEL))),
    metadata: {
      ...(draft.metadata ?? {}),
      eventType: String(draft.metadata?.eventType ?? "confetti"),
      gradeTier,
      levelTier,
      pollTier,
      pollsPerLevel
    }
  };
}

export function getLevelEventProgression(event: GameLevelEvent | LevelEventDraft): ReturnType<typeof readEventProgressionFromMetadata> {
  return readEventProgressionFromMetadata(event.metadata, event.sublevelName);
}

export function formatLevelEventMilestoneCompact(event: GameLevelEvent | LevelEventDraft) {
  const progression = getLevelEventProgression(event);
  return `G-${progression.gradeTier} L-${progression.levelTier} P-${progression.pollTier}`;
}

export function levelEventProgressPolls(event: GameLevelEvent | LevelEventDraft) {
  const progression = getLevelEventProgression(event);

  return progressPollsAtEvent(
    progression.gradeTier,
    progression.levelTier,
    progression.pollTier,
    progression.pollsPerLevel
  );
}

export function compareLevelEvents(
  left: GameLevelEvent,
  right: GameLevelEvent,
  sortKey: LevelEventSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  switch (sortKey) {
    case "milestone":
      result = levelEventProgressPolls(left) - levelEventProgressPolls(right);
      if (result === 0) {
        result = compareText(formatLevelEventMilestoneCompact(left), formatLevelEventMilestoneCompact(right));
      }
      break;
    case "poll":
      result = levelEventProgressPolls(left) - levelEventProgressPolls(right);
      break;
    case "moduleName":
      result = compareText(left.moduleName || "", right.moduleName || "");
      break;
    case "status":
      result = Number(left.isActive) - Number(right.isActive);
      break;
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      break;
    case "eventName":
      result = compareText(left.eventName, right.eventName);
      break;
  }

  if (result === 0) {
    result = compareText(left.eventName, right.eventName);
  }

  return sortDirection === "asc" ? result : -result;
}

export function createLevelEventDraft(_gameLevels: GameLevel[] = [], eventModules: GameEventModule[] = []): LevelEventDraft {
  const firstGameModule = eventModules[0];

  return applyProgressionToLevelEventDraft({
    eventName: "Grade 1 Level 1 Confetti",
    gradeTier: 1,
    levelTier: 1,
    pollTier: DEFAULT_EVENT_POLLS_PER_LEVEL,
    pollsPerLevel: DEFAULT_EVENT_POLLS_PER_LEVEL,
    moduleId: firstGameModule?.id ?? "",
    moduleName: firstGameModule?.name ?? "",
    trigger: "game",
    audience: "both",
    isActive: true,
    metadata: { eventType: "confetti" }
  });
}

export function createRewardDraft(): RewardDraft {
  return {
    name: "Grade: First Red",
    description: "",
    rewardOrder: 1,
    pointsCost: 0,
    inventoryCountText: "",
    status: "active",
    imageUrl: "",
    redemptionUrl: "",
    pollVisualType: "coin",
    pollDigitalProduct: "",
    pollVisualColor: DEFAULT_BADGE_BACKGROUND_COLOR,
    pollVisualSize: "10px",
    pollVisualBorderColor: "",
    pollVisualBorderWidth: "",
    pollVisualSymbolUrl: "",
    levelVisualType: "coin",
    levelDigitalProduct: "",
    levelVisualColor: DEFAULT_BADGE_BACKGROUND_COLOR,
    levelVisualSize: "10px",
    levelVisualBorderColor: "",
    levelVisualBorderWidth: "",
    levelVisualSymbolUrl: "",
    levelTier: 1,
    gradeTier: 1,
    classTier: 1,
    achievementLevelName: "Grade",
    achievementSublevelName: "First",
    featureKey: ""
  };
}

export function createScoringRuleDraft(): ScoringRuleDraft {
  return {
    scoreName: "",
    description: "",
    specificCriteria: "",
    points: 0
  };
}

export function createInterstitialDraft(): InterstitialDraft {
  return {
    name: "",
    description: "",
    interstitialType: "survey",
    displayOrder: 1,
    status: "draft",
    metadata: writeSurveyConfigToMetadata({}, createDefaultSurveyConfig())
  };
}

export function interstitialToDraft(interstitial: GameInterstitial): InterstitialDraft {
  return { ...interstitial, metadata: { ...interstitial.metadata } };
}

export function formatInterstitialStatus(status: GameInterstitialStatus | undefined) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

export function formatInterstitialType(type: GameInterstitialType | undefined) {
  return GAME_INTERSTITIAL_TYPE_LABELS[type ?? "custom"] ?? "Custom";
}

export function gameLevelToDraft(gameLevel: GameLevel): GameLevelDraft {
  return { ...gameLevel, sublevels: gameLevel.sublevels.map((sublevel) => ({ ...sublevel })) };
}

export function levelUpRuleToDraft(rule: GameLevelUpRule): LevelUpRuleDraft {
  return { ...rule, criteria: rule.criteria.map((criterion) => ({ ...criterion })) };
}

export function progressiveFeatureToDraft(feature: GameProgressiveFeature): ProgressiveFeatureDraft {
  return { ...feature, metadata: { ...feature.metadata } };
}

export function levelEventToDraft(event: GameLevelEvent): LevelEventDraft {
  const progression = getLevelEventProgression(event);

  return applyProgressionToLevelEventDraft({
    ...event,
    gradeTier: progression.gradeTier,
    levelTier: progression.levelTier,
    pollTier: progression.pollTier,
    pollsPerLevel: progression.pollsPerLevel,
    metadata: { ...event.metadata }
  });
}

export function getSublevelsForLevel(gameLevels: GameLevel[], levelName: GameLevelName | undefined) {
  return gameLevels.find((gameLevel) => gameLevel.levelName === levelName)?.sublevels ?? [];
}

export function getRewardTierValue(reward: GameReward, tier: RewardTierType): number {
  const explicitValue = Number.parseInt(String(reward.metadata[tier] ?? ""), 10);

  if (Number.isFinite(explicitValue) && explicitValue > 0) {
    return explicitValue;
  }

  // Backfill legacy rewards so existing rows render sensible tiers.
  if (tier === "levelTier") {
    const legacySublevel = String(reward.metadata.achievementSublevelName ?? "").trim();
    const parsedLegacySublevel = Number.parseInt(legacySublevel, 10);

    if (Number.isFinite(parsedLegacySublevel) && parsedLegacySublevel > 0) {
      return parsedLegacySublevel;
    }

    if (Number.isFinite(reward.rewardOrder) && reward.rewardOrder > 0) {
      return reward.rewardOrder;
    }
  }

  return 1;
}

export function resolveRewardAchievementSublevelName(
  reward: GameReward,
  gameLevels: GameLevel[],
  achievementLevelName: GameLevelName,
  levelTier: number
): string {
  const stored = String(reward.metadata.achievementSublevelName ?? "").trim();
  const sublevels = getSublevelsForLevel(gameLevels, achievementLevelName);

  if (stored && sublevels.some((sublevel) => sublevel.name === stored)) {
    return stored;
  }

  const byOrder = sublevels.find((sublevel) => sublevel.order === levelTier);
  if (byOrder) {
    return byOrder.name;
  }

  if (stored) {
    const parsedStoredOrder = Number.parseInt(stored, 10);
    const byStoredOrder = sublevels.find((sublevel) => sublevel.order === parsedStoredOrder);
    if (byStoredOrder) {
      return byStoredOrder.name;
    }

    return stored;
  }

  return sublevels.find((sublevel) => sublevel.order === 1)?.name ?? "First";
}

export function rewardToDraft(reward: GameReward, gameLevels: GameLevel[] = []): RewardDraft {
  const metadata = reward.metadata;
  const pollReward =
    metadata.pollReward && typeof metadata.pollReward === "object" && !Array.isArray(metadata.pollReward)
      ? (metadata.pollReward as Record<string, unknown>)
      : metadata;
  const levelReward =
    metadata.levelReward && typeof metadata.levelReward === "object" && !Array.isArray(metadata.levelReward)
      ? (metadata.levelReward as Record<string, unknown>)
      : metadata;
  const levelTier = getRewardTierValue(reward, "levelTier");
  const gradeTier = getRewardTierValue(reward, "gradeTier");
  const classTier = getRewardTierValue(reward, "classTier");
  const achievementLevelName = (metadata.achievementLevelName as GameLevelName | undefined) ?? "Grade";

  return {
    ...reward,
    inventoryCountText: reward.inventoryCount === null ? "" : String(reward.inventoryCount),
    pollVisualType: String(pollReward.visualType ?? "coin"),
    pollDigitalProduct: String(pollReward.digitalProduct ?? ""),
    pollVisualColor: normalizeBuilderHexColor(pollReward.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
    pollVisualSize: String(pollReward.visualSize ?? "10px"),
    pollVisualBorderColor: String(pollReward.visualBorderColor ?? ""),
    pollVisualBorderWidth: String(pollReward.visualBorderWidth ?? ""),
    pollVisualSymbolUrl: normalizeBuilderAssetUrl(pollReward.visualSymbolUrl),
    levelVisualType: String(levelReward.visualType ?? "coin"),
    levelDigitalProduct: String(levelReward.digitalProduct ?? ""),
    levelVisualColor: normalizeBuilderHexColor(levelReward.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
    levelVisualSize: String(levelReward.visualSize ?? "10px"),
    levelVisualBorderColor: String(levelReward.visualBorderColor ?? ""),
    levelVisualBorderWidth: String(levelReward.visualBorderWidth ?? ""),
    levelVisualSymbolUrl: normalizeBuilderAssetUrl(levelReward.visualSymbolUrl),
    levelTier,
    gradeTier,
    classTier,
    rewardOrder: levelTier,
    achievementLevelName,
    achievementSublevelName: resolveRewardAchievementSublevelName(
      reward,
      gameLevels,
      achievementLevelName,
      levelTier
    ),
    featureKey: String(metadata.featureKey ?? "")
  };
}

export function rewardDraftToMetadata(draft: RewardDraft) {
  const levelTier = Number.isFinite(draft.levelTier) ? Math.max(1, Number(draft.levelTier)) : 1;
  const gradeTier = Number.isFinite(draft.gradeTier) ? Math.max(1, Number(draft.gradeTier)) : 1;
  const classTier = Number.isFinite(draft.classTier) ? Math.max(1, Number(draft.classTier)) : 1;

  return {
    ...(draft.metadata ?? {}),
    pollReward: {
      visualType: draft.pollVisualType ?? "coin",
      digitalProduct: draft.pollDigitalProduct ?? "",
      visualColor: normalizeBuilderHexColor(draft.pollVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
      visualSize: draft.pollVisualSize ?? "10px",
      visualBorderColor: draft.pollVisualBorderColor ?? "",
      visualBorderWidth: draft.pollVisualBorderWidth ?? "",
      visualSymbolUrl: normalizeBuilderAssetUrl(draft.pollVisualSymbolUrl)
    },
    levelReward: {
      visualType: draft.levelVisualType ?? "coin",
      digitalProduct: draft.levelDigitalProduct ?? "",
      visualColor: normalizeBuilderHexColor(draft.levelVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
      visualSize: draft.levelVisualSize ?? "10px",
      visualBorderColor: draft.levelVisualBorderColor ?? "",
      visualBorderWidth: draft.levelVisualBorderWidth ?? "",
      visualSymbolUrl: normalizeBuilderAssetUrl(draft.levelVisualSymbolUrl)
    },
    levelTier,
    gradeTier,
    classTier,
    achievementLevelName: draft.achievementLevelName ?? "Grade",
    achievementSublevelName: draft.achievementSublevelName ?? "",
    featureKey: draft.featureKey ?? ""
  };
}

export function rewardToPayload(reward: RewardDraft | GameReward, overrides: Partial<RewardDraft | GameReward> = {}) {
  const source = { ...reward, ...overrides } as RewardDraft;
  const metadata = "inventoryCountText" in source ? rewardDraftToMetadata(source) : (source.metadata ?? {});
  const levelTier = Number.parseInt(String(metadata.levelTier ?? source.levelTier ?? "1"), 10);

  return {
    name: source.name,
    description: source.description,
    rewardType: source.rewardType,
    rewardOrder: Number.isFinite(levelTier) && levelTier > 0 ? levelTier : 1,
    pointsCost: source.pointsCost,
    inventoryCount:
      "inventoryCountText" in source
        ? source.inventoryCountText
        : source.inventoryCount === null
          ? ""
          : source.inventoryCount,
    status: source.status,
    imageUrl: source.imageUrl,
    redemptionUrl: source.redemptionUrl,
    metadata
  };
}

export function compareRewardsByTier(left: GameReward, right: GameReward) {
  const levelResult = getRewardTierValue(left, "levelTier") - getRewardTierValue(right, "levelTier");
  if (levelResult !== 0) {
    return levelResult;
  }

  const gradeResult = getRewardTierValue(left, "gradeTier") - getRewardTierValue(right, "gradeTier");
  if (gradeResult !== 0) {
    return gradeResult;
  }

  const classResult = getRewardTierValue(left, "classTier") - getRewardTierValue(right, "classTier");
  if (classResult !== 0) {
    return classResult;
  }

  return compareText(left.name, right.name);
}

export function scoringRuleToDraft(scoringRule: GameScoringRule): ScoringRuleDraft {
  return { ...scoringRule };
}

export function rewardTypeLabel(type: GameRewardType) {
  return {
    access: "Access",
    badge: "Badge",
    custom: "Custom",
    digital: "Digital",
    feature: "Feature",
    merch: "Merch",
    token: "Token"
  }[type];
}

export function statusLabel(status: GameRewardStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });
}

export function formatSublevels(sublevels: GameSublevel[] | undefined) {
  return (sublevels ?? [])
    .slice()
    .sort((left, right) => left.order - right.order || compareText(left.name, right.name))
    .map((sublevel) => `${sublevel.order}. ${sublevel.name}`)
    .join(", ");
}

export function getScoringRuleLabel(scoringRules: GameScoringRule[], scoringRuleId: string) {
  const scoringRule = scoringRules.find((rule) => rule.id === scoringRuleId);
  return scoringRule ? `${scoringRule.scoreName} (${scoringRule.points} pts)` : "Unknown scoring rule";
}

export function formatLevelUpCriteria(rule: GameLevelUpRule, scoringRules: GameScoringRule[]) {
  return rule.criteria.length
    ? rule.criteria
        .map((criterion) => `${criterion.requiredCount}x ${getScoringRuleLabel(scoringRules, criterion.scoringRuleId)}`)
        .join(", ")
    : "No criteria";
}

export function formatRewardVisualSortValue(reward: GameReward) {
  const pollReward = getGameRewardDiscVisual(reward, "pollReward");
  const levelReward = getGameRewardDiscVisual(reward, "levelReward");
  return `${pollReward.visualType} ${pollReward.visualColor} ${pollReward.visualSize} ${levelReward.visualType} ${levelReward.visualColor} ${levelReward.visualSize}`;
}

export function compareGameLevels(
  left: GameLevel,
  right: GameLevel,
  sortKey: GameLevelSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  switch (sortKey) {
    case "levelOrder":
      result = left.levelOrder - right.levelOrder;
      break;
    case "sublevels":
      result = compareText(formatSublevels(left.sublevels), formatSublevels(right.sublevels));
      break;
    case "levelName":
      result = compareText(left.levelName, right.levelName);
      break;
  }

  return sortDirection === "asc" ? result : -result;
}

export function compareRewards(
  left: GameReward,
  right: GameReward,
  sortKey: RewardSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  switch (sortKey) {
    case "levelTier":
      result = getRewardTierValue(left, "levelTier") - getRewardTierValue(right, "levelTier");
      break;
    case "gradeTier":
      result = getRewardTierValue(left, "gradeTier") - getRewardTierValue(right, "gradeTier");
      break;
    case "classTier":
      result = getRewardTierValue(left, "classTier") - getRewardTierValue(right, "classTier");
      break;
    case "rewardType":
      result = compareText(rewardTypeLabel(left.rewardType), rewardTypeLabel(right.rewardType));
      break;
    case "rewardVisual":
      result = compareText(formatRewardVisualSortValue(left), formatRewardVisualSortValue(right));
      break;
    case "name":
      result = compareText(left.name, right.name);
      break;
  }

  if (result === 0) {
    result = compareRewardsByTier(left, right);
  }

  return sortDirection === "asc" ? result : -result;
}

export function compareScoringRules(
  left: GameScoringRule,
  right: GameScoringRule,
  sortKey: ScoringRuleSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  switch (sortKey) {
    case "points":
      result = left.points - right.points;
      break;
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      break;
    case "scoreName":
    case "description":
    case "specificCriteria":
      result = compareText(left[sortKey], right[sortKey]);
      break;
  }

  return sortDirection === "asc" ? result : -result;
}

