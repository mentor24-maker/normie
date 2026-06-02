"use client";

import { Fragment, useEffect, useMemo, useState, type DragEvent } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import { buildRewardSymbolOptions, type RewardSymbolOption } from "@/lib/game-reward-symbol-options";
import {
  buildRewardDiscVisualFromDraft,
  getGameRewardDiscVisual
} from "@/lib/reward-disc-visual";
import { RewardDiscPreview } from "@/components/reward-disc-preview";
import { AdminGameAudienceField } from "@/components/admin-game-audience-field";
import type { GameAudience } from "@/lib/game-audience";
import type {
  GameLevel,
  GameLevelName,
  GameLevelUpCriterion,
  GameLevelUpRule,
  GameLevelEvent,
  GameEventModule,
  GameProgressiveFeature,
  GameSublevel,
  GameReward,
  GameRewardStatus,
  GameRewardType,
  GameScoringRule
} from "@/lib/game-admin";
import { GAME_LEVEL_NAMES, GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import {
  DEFAULT_EVENT_POLLS_PER_LEVEL,
  eventTargetProgressPolls,
  formatProgressionMilestone,
  progressPollsAtEvent,
  readEventProgressionFromMetadata
} from "@/lib/player-progression-tiers";
import { PLAYER_LEVELS_PER_GRADE } from "@/lib/player-portal";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";
import { BuilderSettingRow } from "@/components/builder/builder-setting-row";
import {
  buildNumericSelectWidthStyle,
  getNumericSelectDigitCountFromOptions
} from "@/components/builder/builder-inline-number-select";

type GameSnapshot = {
  gameLevels: GameLevel[];
  eventModules: GameEventModule[];
  levelUpRules: GameLevelUpRule[];
  levelEvents: GameLevelEvent[];
  progressiveFeatures: GameProgressiveFeature[];
  rewards: GameReward[];
  scoringRules: GameScoringRule[];
};

type GameLevelDraft = Partial<GameLevel>;
type LevelUpRuleDraft = Partial<GameLevelUpRule>;
type LevelEventDraft = Partial<GameLevelEvent> & {
  gradeTier?: number;
  levelTier?: number;
  pollTier?: number;
  pollsPerLevel?: number;
};
type ProgressiveFeatureDraft = Partial<GameProgressiveFeature>;
type RewardDraft = Partial<GameReward> & {
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
type ScoringRuleDraft = Partial<GameScoringRule>;
type SortDirection = "asc" | "desc";
type GameSection = "levels" | "scoring" | "level-up" | "redemptions";
type GameLevelSortKey = "levelName" | "levelOrder" | "sublevels";
type RewardSortKey = "name" | "rewardType" | "levelTier" | "gradeTier" | "classTier" | "rewardVisual";
type ScoringRuleSortKey = "scoreName" | "description" | "specificCriteria" | "points" | "updatedAt";
type LevelEventSortKey = "eventName" | "milestone" | "poll" | "moduleName" | "status" | "updatedAt";
type RewardTierType = "levelTier" | "gradeTier" | "classTier";
type RewardBulkAction = RewardTierType | "pollSize" | "levelSize" | "color";

function isRewardTierBulkAction(action: RewardBulkAction): action is RewardTierType {
  return action === "levelTier" || action === "gradeTier" || action === "classTier";
}

function buildBulkRewardColorMetadata(reward: GameReward, color: string): Record<string, unknown> {
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

function buildBulkRewardSingleSizeMetadata(
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

function getRewardSaveDiagnosticTone(
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

const DEFAULT_BADGE_BACKGROUND_COLOR = "#d8212d";
const GAME_LEVEL_NAME_LABELS: Record<string, string> = {
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

const GAME_LEVEL_TABLE_COLUMNS: Array<{ key: GameLevelSortKey; label: string }> = [
  { key: "levelName", label: "Progression Track" },
  { key: "levelOrder", label: "Order" },
  { key: "sublevels", label: "Sublevels" }
];

const REWARD_TABLE_COLUMNS: Array<{ key: RewardSortKey; label: string }> = [
  { key: "name", label: "Reward" },
  { key: "rewardType", label: "Type" },
  { key: "levelTier", label: "Level" },
  { key: "gradeTier", label: "Grade" },
  { key: "classTier", label: "Class" },
  { key: "rewardVisual", label: "Reward Disk" }
];
const REWARD_TABLE_COLUMN_COUNT = REWARD_TABLE_COLUMNS.length + 2;

const SCORING_TABLE_COLUMNS: Array<{ key: ScoringRuleSortKey; label: string }> = [
  { key: "scoreName", label: "Score Name" },
  { key: "description", label: "Description" },
  { key: "specificCriteria", label: "Specific Criteria" },
  { key: "points", label: "Points" },
  { key: "updatedAt", label: "Updated" }
];

const LEVEL_EVENT_TABLE_COLUMNS: Array<{ key: LevelEventSortKey; label: string }> = [
  { key: "eventName", label: "Event" },
  { key: "milestone", label: "Milestone" },
  { key: "poll", label: "Poll" },
  { key: "moduleName", label: "Module" },
  { key: "status", label: "Status" },
  { key: "updatedAt", label: "Updated" }
];

const GAME_SECTION_TILES: Array<{ key: GameSection; label: string; description: string }> = [
  { key: "levels", label: "Progression Tracks", description: "Tracks, sublevels, and order." },
  { key: "scoring", label: "Point Scoring", description: "Ways players earn points." },
  { key: "level-up", label: "Level Up", description: "Graduation rules and criteria." },
  { key: "redemptions", label: "Rewards & Redemptions", description: "Achievement rewards and point claims." }
];

async function readAdminJson<T extends { error?: string }>(response: Response, fallbackMessage: string): Promise<T> {
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

function reorderItems<T>(items: T[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}

function normalizeSublevelOrder(sublevels: GameSublevel[]) {
  return sublevels.map((sublevel, index) => ({ ...sublevel, order: index + 1 }));
}

function formatGameLevelName(levelName: GameLevelName | string | undefined): string {
  if (!levelName) {
    return "";
  }

  return GAME_LEVEL_NAME_LABELS[levelName] ?? levelName;
}

function createGameLevelDraft(): GameLevelDraft {
  return {
    levelName: "Level",
    levelOrder: 1,
    sublevels: []
  };
}

function createLevelUpRuleDraft(gameLevels: GameLevel[] = [], scoringRules: GameScoringRule[] = []): LevelUpRuleDraft {
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

function createProgressiveFeatureDraft(gameLevels: GameLevel[] = []): ProgressiveFeatureDraft {
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

const LEVEL_TIER_OPTIONS = Array.from({ length: PLAYER_LEVELS_PER_GRADE }, (_, index) => index + 1);

function applyProgressionToLevelEventDraft(draft: LevelEventDraft): LevelEventDraft {
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

function getLevelEventProgression(event: GameLevelEvent | LevelEventDraft): ReturnType<typeof readEventProgressionFromMetadata> {
  return readEventProgressionFromMetadata(event.metadata, event.sublevelName);
}

function formatLevelEventMilestoneCompact(event: GameLevelEvent | LevelEventDraft) {
  const progression = getLevelEventProgression(event);
  return `G-${progression.gradeTier} L-${progression.levelTier} P-${progression.pollTier}`;
}

function levelEventProgressPolls(event: GameLevelEvent | LevelEventDraft) {
  const progression = getLevelEventProgression(event);

  return progressPollsAtEvent(
    progression.gradeTier,
    progression.levelTier,
    progression.pollTier,
    progression.pollsPerLevel
  );
}

function compareLevelEvents(
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

function createLevelEventDraft(_gameLevels: GameLevel[] = [], eventModules: GameEventModule[] = []): LevelEventDraft {
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

function createRewardDraft(): RewardDraft {
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

function createScoringRuleDraft(): ScoringRuleDraft {
  return {
    scoreName: "",
    description: "",
    specificCriteria: "",
    points: 0
  };
}

function gameLevelToDraft(gameLevel: GameLevel): GameLevelDraft {
  return { ...gameLevel, sublevels: gameLevel.sublevels.map((sublevel) => ({ ...sublevel })) };
}

function levelUpRuleToDraft(rule: GameLevelUpRule): LevelUpRuleDraft {
  return { ...rule, criteria: rule.criteria.map((criterion) => ({ ...criterion })) };
}

function progressiveFeatureToDraft(feature: GameProgressiveFeature): ProgressiveFeatureDraft {
  return { ...feature, metadata: { ...feature.metadata } };
}

function levelEventToDraft(event: GameLevelEvent): LevelEventDraft {
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

function getSublevelsForLevel(gameLevels: GameLevel[], levelName: GameLevelName | undefined) {
  return gameLevels.find((gameLevel) => gameLevel.levelName === levelName)?.sublevels ?? [];
}

function getRewardTierValue(reward: GameReward, tier: RewardTierType): number {
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

function resolveRewardAchievementSublevelName(
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

function rewardToDraft(reward: GameReward, gameLevels: GameLevel[] = []): RewardDraft {
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

function rewardDraftToMetadata(draft: RewardDraft) {
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

function rewardToPayload(reward: RewardDraft | GameReward, overrides: Partial<RewardDraft | GameReward> = {}) {
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

function compareRewardsByTier(left: GameReward, right: GameReward) {
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

function scoringRuleToDraft(scoringRule: GameScoringRule): ScoringRuleDraft {
  return { ...scoringRule };
}

function rewardTypeLabel(type: GameRewardType) {
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

function statusLabel(status: GameRewardStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });
}

function formatSublevels(sublevels: GameSublevel[] | undefined) {
  return (sublevels ?? [])
    .slice()
    .sort((left, right) => left.order - right.order || compareText(left.name, right.name))
    .map((sublevel) => `${sublevel.order}. ${sublevel.name}`)
    .join(", ");
}

function getScoringRuleLabel(scoringRules: GameScoringRule[], scoringRuleId: string) {
  const scoringRule = scoringRules.find((rule) => rule.id === scoringRuleId);
  return scoringRule ? `${scoringRule.scoreName} (${scoringRule.points} pts)` : "Unknown scoring rule";
}

function formatLevelUpCriteria(rule: GameLevelUpRule, scoringRules: GameScoringRule[]) {
  return rule.criteria.length
    ? rule.criteria
        .map((criterion) => `${criterion.requiredCount}x ${getScoringRuleLabel(scoringRules, criterion.scoringRuleId)}`)
        .join(", ")
    : "No criteria";
}

function formatRewardVisualSortValue(reward: GameReward) {
  const pollReward = getGameRewardDiscVisual(reward, "pollReward");
  const levelReward = getGameRewardDiscVisual(reward, "levelReward");
  return `${pollReward.visualType} ${pollReward.visualColor} ${pollReward.visualSize} ${levelReward.visualType} ${levelReward.visualColor} ${levelReward.visualSize}`;
}

function RewardVisualSummary({ reward }: { reward: GameReward }) {
  const pollVisual = getGameRewardDiscVisual(reward, "pollReward");
  const levelVisual = getGameRewardDiscVisual(reward, "levelReward");

  return (
    <div className="admin-game-reward-visual-summary">
      {[
        ["Poll-Level", pollVisual, "player-portal-reward-disk"],
        ["Level-Level", levelVisual, "player-portal-level-coin"]
      ].map(([label, visual, className]) => (
        <div className="admin-game-reward-visual-item" key={label as string}>
          <RewardDiscPreview
            ariaLabel={`${label as string} reward disk`}
            className={className as string}
            isEarned
            visual={visual as ReturnType<typeof getGameRewardDiscVisual>}
          />
          <span>
            <strong>{label as string}</strong>
            <span>
              {(visual as ReturnType<typeof getGameRewardDiscVisual>).visualColor} /{" "}
              {(visual as ReturnType<typeof getGameRewardDiscVisual>).visualSize}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function compareGameLevels(
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

function compareRewards(
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

function compareScoringRules(
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

function AdminTableSortButton<Key extends string>({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort
}: {
  label: string;
  sortKey: Key;
  activeSortKey: Key;
  sortDirection: SortDirection;
  onSort: (key: Key) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const indicator = isActive ? (sortDirection === "asc" ? "▲" : "▼") : "↕";

  return (
    <button
      className={`admin-table-sort-button${isActive ? " is-active" : ""}`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="admin-table-sort-indicator">
        {indicator}
      </span>
    </button>
  );
}

function GameLevelEditor({
  draft,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: GameLevelDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: GameLevelDraft) => void;
  onSave: () => void;
}) {
  const sublevels = draft.sublevels ?? [];
  const [draggedSublevelIndex, setDraggedSublevelIndex] = useState<number | null>(null);

  function updateSublevel(index: number, updates: Partial<GameSublevel>) {
    onChange({
      ...draft,
      sublevels: sublevels.map((sublevel, currentIndex) =>
        currentIndex === index ? { ...sublevel, ...updates } : sublevel
      )
    });
  }

  function addSublevel() {
    onChange({
      ...draft,
      sublevels: [
        ...sublevels,
        {
          name: "",
          order: sublevels.length + 1
        }
      ]
    });
  }

  function removeSublevel(index: number) {
    onChange({
      ...draft,
      sublevels: normalizeSublevelOrder(sublevels.filter((_, currentIndex) => currentIndex !== index))
    });
  }

  function moveSublevel(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    onChange({
      ...draft,
      sublevels: normalizeSublevelOrder(reorderItems(sublevels, index, targetIndex))
    });
  }

  function handleSublevelDragStart(event: DragEvent<HTMLElement>, index: number) {
    event.dataTransfer.setData("application/normie-game-sublevel-index", String(index));
    event.dataTransfer.effectAllowed = "move";
    setDraggedSublevelIndex(index);
  }

  function handleSublevelDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleSublevelDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    const sourceIndex = Number.parseInt(
      event.dataTransfer.getData("application/normie-game-sublevel-index") || String(draggedSublevelIndex ?? -1),
      10
    );
    setDraggedSublevelIndex(null);

    if (!Number.isFinite(sourceIndex) || sourceIndex === targetIndex) {
      return;
    }

    onChange({
      ...draft,
      sublevels: normalizeSublevelOrder(reorderItems(sublevels, sourceIndex, targetIndex))
    });
  }

  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field admin-game-inline-field">
          <span>Progression Track</span>
          <select
            value={draft.levelName ?? "Level"}
            onChange={(event) => onChange({ ...draft, levelName: event.target.value as GameLevelName })}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
            ))}
          </select>
        </label>
        <label className="field admin-game-inline-field">
          <span>Track Order</span>
          <select
            value={String(draft.levelOrder ?? 1)}
            onChange={(event) => onChange({ ...draft, levelOrder: Number(event.target.value) })}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((levelOrder) => (
              <option key={levelOrder} value={levelOrder}>{levelOrder}</option>
            ))}
          </select>
        </label>
        <div className="admin-game-wide-field admin-game-sublevels-editor">
          <div className="admin-game-sublevels-header">
            <span>Sublevels</span>
            <button className="secondary-button" disabled={isSaving} onClick={addSublevel} type="button">
              Add Sublevel
            </button>
          </div>
          <div className="admin-game-sublevels-list">
            {sublevels.map((sublevel, index) => (
              <div
                className={`admin-game-sublevel-row${draggedSublevelIndex === index ? " is-dragging" : ""}`}
                key={`${sublevel.order}-${index}`}
                onDragEnd={() => setDraggedSublevelIndex(null)}
                onDragOver={handleSublevelDragOver}
                onDrop={(event) => handleSublevelDrop(event, index)}
              >
                <div className="admin-game-reorder-controls">
                  <span
                    className="admin-game-drag-handle"
                    draggable
                    onDragStart={(event) => handleSublevelDragStart(event, index)}
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <button
                    aria-label="Move sublevel up"
                    className="polls-icon-button"
                    disabled={isSaving || index === 0}
                    onClick={() => moveSublevel(index, -1)}
                    title="Move up"
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Move sublevel down"
                    className="polls-icon-button"
                    disabled={isSaving || index === sublevels.length - 1}
                    onClick={() => moveSublevel(index, 1)}
                    title="Move down"
                    type="button"
                  >
                    ↓
                  </button>
                </div>
                <label className="field admin-game-inline-field">
                  <span>Sublevel name</span>
                  <input
                    type="text"
                    value={sublevel.name}
                    onChange={(event) => updateSublevel(index, { name: event.target.value })}
                    placeholder="Apprentice"
                  />
                </label>
                <label className="field admin-game-inline-field">
                  <span>Sublevel order</span>
                  <select
                    value={String(sublevel.order)}
                    onChange={(event) => updateSublevel(index, { order: Number(event.target.value) })}
                  >
                    {Array.from({ length: 100 }, (_, orderIndex) => orderIndex + 1).map((sublevelOrder) => (
                      <option key={sublevelOrder} value={sublevelOrder}>{sublevelOrder}</option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label="Remove sublevel"
                  className="polls-icon-button polls-icon-button-danger admin-game-sublevel-remove"
                  disabled={isSaving}
                  onClick={() => removeSublevel(index)}
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            {sublevels.length === 0 ? (
              <p className="admin-table-empty admin-game-sublevels-empty">No sublevels added yet.</p>
            ) : null}
            <button
              aria-label="Add sublevel"
              className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
              disabled={isSaving}
              onClick={addSublevel}
              title="Add sublevel"
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Progression Track"}
        </button>
      </div>
    </div>
  );
}

function LevelUpRuleEditor({
  draft,
  gameLevels,
  isSaving,
  onCancel,
  onChange,
  onSave,
  scoringRules
}: {
  draft: LevelUpRuleDraft;
  gameLevels: GameLevel[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: LevelUpRuleDraft) => void;
  onSave: () => void;
  scoringRules: GameScoringRule[];
}) {
  const criteria = draft.criteria ?? [];
  const sublevels = getSublevelsForLevel(gameLevels, draft.levelName);

  function updateCriterion(index: number, updates: Partial<GameLevelUpCriterion>) {
    onChange({
      ...draft,
      criteria: criteria.map((criterion, currentIndex) =>
        currentIndex === index ? { ...criterion, ...updates } : criterion
      )
    });
  }

  function addCriterion() {
    const firstScoringRule = scoringRules[0];
    if (!firstScoringRule) return;

    onChange({
      ...draft,
      criteria: [
        ...criteria,
        {
          scoringRuleId: firstScoringRule.id,
          requiredCount: 1,
          notes: ""
        }
      ]
    });
  }

  function removeCriterion(index: number) {
    onChange({
      ...draft,
      criteria: criteria.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field admin-game-inline-field">
          <span>Level</span>
          <select
            value={draft.levelName ?? "Grade"}
            onChange={(event) => {
              const levelName = event.target.value as GameLevelName;
              const firstSublevel = getSublevelsForLevel(gameLevels, levelName).slice().sort((left, right) => left.order - right.order)[0];
              onChange({ ...draft, levelName, sublevelName: firstSublevel?.name ?? "" });
            }}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
            ))}
          </select>
        </label>
        <label className="field admin-game-inline-field">
          <span>Sublevel</span>
          <select
            value={draft.sublevelName ?? ""}
            onChange={(event) => onChange({ ...draft, sublevelName: event.target.value })}
          >
            <option value="">Select sublevel</option>
            {sublevels
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((sublevel) => (
                <option key={`${sublevel.order}-${sublevel.name}`} value={sublevel.name}>{sublevel.name}</option>
              ))}
          </select>
        </label>
        <label className="field admin-game-inline-field">
          <span>Status</span>
          <select
            value={draft.isActive === false ? "false" : "true"}
            onChange={(event) => onChange({ ...draft, isActive: event.target.value === "true" })}
          >
            <option value="true">Active</option>
            <option value="false">Draft</option>
          </select>
        </label>
        <div className="admin-game-wide-field admin-game-sublevels-editor">
          <div className="admin-game-sublevels-header">
            <span>Graduation criteria</span>
            <button className="secondary-button" disabled={isSaving || scoringRules.length === 0} onClick={addCriterion} type="button">
              Add Criteria
            </button>
          </div>
          <div className="admin-game-sublevels-list">
            {criteria.map((criterion, index) => (
              <div className="admin-game-levelup-criterion-row" key={`${criterion.scoringRuleId}-${index}`}>
                <label className="field admin-game-inline-field">
                  <span>Scoring item</span>
                  <select
                    value={criterion.scoringRuleId}
                    onChange={(event) => updateCriterion(index, { scoringRuleId: event.target.value })}
                  >
                    {scoringRules.map((scoringRule) => (
                      <option key={scoringRule.id} value={scoringRule.id}>
                        {scoringRule.scoreName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field admin-game-inline-field">
                  <span>Required</span>
                  <input
                    min="1"
                    type="number"
                    value={criterion.requiredCount}
                    onChange={(event) => updateCriterion(index, { requiredCount: Number(event.target.value) })}
                  />
                </label>
                <label className="field admin-game-inline-field">
                  <span>Notes</span>
                  <input
                    type="text"
                    value={criterion.notes}
                    onChange={(event) => updateCriterion(index, { notes: event.target.value })}
                    placeholder="Optional condition notes"
                  />
                </label>
                <button
                  aria-label="Remove criteria"
                  className="polls-icon-button polls-icon-button-danger admin-game-sublevel-remove"
                  disabled={isSaving}
                  onClick={() => removeCriterion(index)}
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            {criteria.length === 0 ? (
              <p className="admin-table-empty admin-game-sublevels-empty">
                Add criteria from Point Scoring to define when this graduation happens.
              </p>
            ) : null}
            <button
              aria-label="Add criteria"
              className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
              disabled={isSaving || scoringRules.length === 0}
              onClick={addCriterion}
              title="Add criteria"
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Level Up Rule"}
        </button>
      </div>
    </div>
  );
}

function ProgressiveFeatureEditor({
  draft,
  gameLevels,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: ProgressiveFeatureDraft;
  gameLevels: GameLevel[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: ProgressiveFeatureDraft) => void;
  onSave: () => void;
}) {
  const sublevels = getSublevelsForLevel(gameLevels, draft.unlockLevelName);

  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field admin-game-inline-field">
          <span>Feature Name</span>
          <input
            type="text"
            value={draft.name ?? ""}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Skip Poll"
          />
        </label>
        <label className="field admin-game-inline-field">
          <span>Feature Key</span>
          <input
            type="text"
            value={draft.featureKey ?? ""}
            onChange={(event) => onChange({ ...draft, featureKey: event.target.value })}
            placeholder="poll_skip"
          />
        </label>
        <label className="field admin-game-inline-field">
          <span>Status</span>
          <select
            value={draft.isActive === false ? "draft" : "active"}
            onChange={(event) => onChange({ ...draft, isActive: event.target.value === "active" })}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="field admin-game-inline-field">
          <span>Unlock Track</span>
          <select
            value={draft.unlockLevelName ?? "Level"}
            onChange={(event) => {
              const unlockLevelName = event.target.value as GameLevelName;
              const firstSublevel = getSublevelsForLevel(gameLevels, unlockLevelName).slice().sort((left, right) => left.order - right.order)[0];
              onChange({ ...draft, unlockLevelName, unlockSublevelName: firstSublevel?.name ?? "" });
            }}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
            ))}
          </select>
        </label>
        <label className="field admin-game-inline-field">
          <span>Unlock Sublevel</span>
          <select
            value={draft.unlockSublevelName ?? ""}
            onChange={(event) => onChange({ ...draft, unlockSublevelName: event.target.value })}
          >
            <option value="">Select sublevel</option>
            {sublevels.map((sublevel) => (
              <option key={`${sublevel.order}-${sublevel.name}`} value={sublevel.name}>
                {sublevel.order}. {sublevel.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field admin-game-wide-field">
          <span>Description</span>
          <textarea
            value={draft.description ?? ""}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            placeholder="What this unlock enables for the player."
          />
        </label>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Feature"}
        </button>
      </div>
    </div>
  );
}

function LevelEventEditor({
  draft,
  eventModules,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: LevelEventDraft;
  eventModules: GameEventModule[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: LevelEventDraft) => void;
  onSave: () => void;
}) {
  const gradeTier = Math.max(1, Number(draft.gradeTier) || 1);
  const levelTier = Math.min(PLAYER_LEVELS_PER_GRADE, Math.max(1, Number(draft.levelTier) || 1));
  const pollsPerLevel = Math.max(1, Number(draft.pollsPerLevel) || DEFAULT_EVENT_POLLS_PER_LEVEL);
  const pollTier = Math.min(pollsPerLevel, Math.max(1, Number(draft.pollTier) || pollsPerLevel));
  const pollTierOptions = Array.from({ length: pollsPerLevel }, (_, index) => index + 1);
  const targetProgressPolls = progressPollsAtEvent(gradeTier, levelTier, pollTier, pollsPerLevel);

  function updateDraft(next: LevelEventDraft) {
    onChange(applyProgressionToLevelEventDraft(next));
  }

  return (
    <div className="builder-product-editor admin-game-editor admin-game-level-event-editor">
      <div className="admin-game-reward-grid">
        <BuilderSettingRow fullWidth label="Event Name">
          <input
            className="admin-game-reward-field-medium"
            type="text"
            value={draft.eventName ?? ""}
            onChange={(event) => updateDraft({ ...draft, eventName: event.target.value })}
            placeholder="Grade 1 Level 1 Confetti"
          />
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Grade">
          <input
            className="admin-game-reward-field-number"
            min="1"
            type="number"
            value={gradeTier}
            onChange={(event) =>
              updateDraft({ ...draft, gradeTier: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Level">
          <select
            className="admin-game-reward-field-select"
            value={levelTier}
            onChange={(event) =>
              updateDraft({ ...draft, levelTier: Math.max(1, Number(event.target.value) || 1) })
            }
          >
            {LEVEL_TIER_OPTIONS.map((tier) => (
              <option key={tier} value={tier}>
                Level {tier}
              </option>
            ))}
          </select>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Polls Per Level">
          <input
            className="admin-game-reward-field-number"
            min="1"
            type="number"
            value={pollsPerLevel}
            onChange={(event) => {
              const nextPollsPerLevel = Math.max(1, Number(event.target.value) || DEFAULT_EVENT_POLLS_PER_LEVEL);
              updateDraft({
                ...draft,
                pollsPerLevel: nextPollsPerLevel,
                pollTier: Math.min(nextPollsPerLevel, pollTier)
              });
            }}
          />
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Poll">
          <select
            className="admin-game-reward-field-select"
            value={pollTier}
            onChange={(event) =>
              updateDraft({ ...draft, pollTier: Math.max(1, Number(event.target.value) || pollsPerLevel) })
            }
          >
            {pollTierOptions.map((tier) => (
              <option key={tier} value={tier}>
                Poll {tier}
              </option>
            ))}
          </select>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Milestone">
          <p className="admin-game-level-event-milestone">
            Fires after progress poll {targetProgressPolls} when the player reaches{" "}
            {formatProgressionMilestone(gradeTier, levelTier, pollTier, pollsPerLevel)}.
          </p>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Module">
          <select
            className="admin-game-reward-field-select"
            value={draft.moduleId ?? ""}
            onChange={(event) => updateDraft({ ...draft, moduleId: event.target.value })}
          >
            <option value="">Select Module</option>
            {eventModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name} ({module.moduleClass})
              </option>
            ))}
          </select>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Trigger">
          <select className="admin-game-reward-field-select" value="game" disabled>
            <option value="game">Game</option>
          </select>
        </BuilderSettingRow>
        <AdminGameAudienceField
          value={(draft.audience ?? "both") as GameAudience}
          onChange={(audience) => updateDraft({ ...draft, audience })}
        />
        <BuilderSettingRow fullWidth label="Status">
          <select
            className="admin-game-reward-field-select"
            value={draft.isActive === false ? "draft" : "active"}
            onChange={(event) => updateDraft({ ...draft, isActive: event.target.value === "active" })}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </BuilderSettingRow>
      </div>
      <p className="admin-field-help admin-game-level-event-help">
        Choose any saved confetti, floating image, or speech bubble module. Audience controls whether the event
        fires on the public site, in the player portal, or both.
      </p>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Event"}
        </button>
      </div>
    </div>
  );
}

const BADGE_STYLE_OPTIONS = ["coin", "jewel", "ribbon", "medal", "trophy"];
const REWARD_BORDER_WIDTH_OPTIONS = Array.from({ length: 10 }, (_, index) => `${index + 1}px`);
const REWARD_BORDER_WIDTH_DIGIT_COUNT = getNumericSelectDigitCountFromOptions(REWARD_BORDER_WIDTH_OPTIONS);

type RewardStyleValues = {
  visualType?: string;
  digitalProduct?: string;
  visualColor?: string;
  visualSize?: string;
  visualBorderColor?: string;
  visualBorderWidth?: string;
  visualSymbolUrl?: string;
};

function RewardStyleColumn({
  title,
  rewardType,
  values,
  onChange,
  showSymbol = false,
  isUploadingSymbol = false,
  onSymbolFileSelect,
  symbolOptions,
  previewClassName = "player-portal-reward-disk"
}: {
  title: string;
  rewardType: GameRewardType;
  values: RewardStyleValues;
  onChange: (next: RewardStyleValues) => void;
  showSymbol?: boolean;
  isUploadingSymbol?: boolean;
  onSymbolFileSelect?: (file: File | null) => void;
  symbolOptions: RewardSymbolOption[];
  previewClassName?: string;
}) {
  const previewVisual = buildRewardDiscVisualFromDraft(values);
  const selectedSymbolUrl = normalizeBuilderAssetUrl(values.visualSymbolUrl);

  return (
    <div className="admin-game-reward-style-column">
      <h3>{title}</h3>
      <div className="admin-game-reward-disc-live-preview">
        <RewardDiscPreview
          ariaLabel={`${title} preview`}
          className={previewClassName}
          isEarned
          visual={previewVisual}
        />
      </div>
      {rewardType === "badge" ? (
        <BuilderSettingRow fullWidth label="Badge">
          <select
            className="admin-game-reward-field-select"
            value={values.visualType ?? "coin"}
            onChange={(event) => onChange({ ...values, visualType: event.target.value })}
          >
            {BADGE_STYLE_OPTIONS.map((badge) => (
              <option key={badge} value={badge}>{badge}</option>
            ))}
          </select>
        </BuilderSettingRow>
      ) : null}
      {rewardType === "digital" ? (
        <BuilderSettingRow fullWidth label="Product">
          <select
            className="admin-game-reward-field-select"
            value={values.digitalProduct ?? ""}
            onChange={(event) => onChange({ ...values, digitalProduct: event.target.value })}
          >
            <option value="">TBD</option>
          </select>
        </BuilderSettingRow>
      ) : null}
      {showSymbol ? (
        <>
          <BuilderSettingRow fullWidth label="Symbol">
            <select
              className="admin-game-reward-field-wide"
              value={selectedSymbolUrl}
              onChange={(event) => onChange({ ...values, visualSymbolUrl: event.target.value })}
            >
              {symbolOptions.map((option) => (
                <option key={`${option.group}-${option.value || "none"}`} value={option.value}>
                  {option.group === "gallery"
                    ? `Badge Gallery: ${option.label}`
                    : option.group === "in-use"
                      ? `In Use: ${option.label}`
                      : option.label}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Upload">
            <input
              accept="image/*"
              className="admin-game-reward-field-file"
              disabled={isUploadingSymbol}
              onChange={(event) => {
                onSymbolFileSelect?.(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </BuilderSettingRow>
          {isUploadingSymbol ? (
            <p className="admin-field-help admin-game-reward-symbol-help">Uploading symbol...</p>
          ) : null}
          {!selectedSymbolUrl ? (
            <p className="admin-field-help admin-game-reward-symbol-help">
              Choose a badge-marked gallery image or upload a new symbol. Uploads from here are marked for badge use
              automatically.
            </p>
          ) : null}
        </>
      ) : null}
      <BuilderSettingRow fullWidth label="Background">
        <input
          aria-label={`${title} background color`}
          type="color"
          value={normalizeBuilderHexColor(values.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR)}
          onChange={(event) => onChange({ ...values, visualColor: event.target.value })}
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Size">
        <input
          className="admin-game-reward-field-short"
          type="text"
          value={values.visualSize ?? "10px"}
          onChange={(event) => onChange({ ...values, visualSize: event.target.value })}
          placeholder="10px"
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Border Color">
        <input
          className="admin-game-reward-field-short"
          type="text"
          value={values.visualBorderColor ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderColor: event.target.value })}
          placeholder="#991b1b"
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Border Width">
        <select
          className="builder-number-select-control"
          style={buildNumericSelectWidthStyle(REWARD_BORDER_WIDTH_DIGIT_COUNT)}
          value={values.visualBorderWidth ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderWidth: event.target.value })}
        >
          <option value="">None</option>
          {REWARD_BORDER_WIDTH_OPTIONS.map((width) => (
            <option key={width} value={width}>{width}</option>
          ))}
        </select>
      </BuilderSettingRow>
    </div>
  );
}

function RewardEditor({
  draft,
  gameLevels,
  progressiveFeatures,
  galleryMedia,
  rewards,
  isSaving,
  onCancel,
  onChange,
  onSave,
  onGalleryRefresh
}: {
  draft: RewardDraft;
  gameLevels: GameLevel[];
  progressiveFeatures: GameProgressiveFeature[];
  galleryMedia: AdminMediaItem[];
  rewards: GameReward[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: RewardDraft) => void;
  onSave: () => void;
  onGalleryRefresh: () => Promise<void>;
}) {
  const sublevels = getSublevelsForLevel(gameLevels, draft.achievementLevelName);
  const selectedRewardType = draft.rewardType ?? "";
  const [isUploadingPollSymbol, setIsUploadingPollSymbol] = useState(false);
  const [isUploadingLevelSymbol, setIsUploadingLevelSymbol] = useState(false);
  const pollSymbolOptions = useMemo(
    () => buildRewardSymbolOptions(galleryMedia, rewards, draft.pollVisualSymbolUrl),
    [draft.pollVisualSymbolUrl, galleryMedia, rewards]
  );
  const levelSymbolOptions = useMemo(
    () => buildRewardSymbolOptions(galleryMedia, rewards, draft.levelVisualSymbolUrl),
    [draft.levelVisualSymbolUrl, galleryMedia, rewards]
  );

  async function uploadPollSymbol(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingPollSymbol(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("badge", "1");
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: { path?: string }; error?: string }>(
        response,
        "Failed to upload symbol."
      );

      if (!data.media?.path) {
        throw new Error(data.error ?? "Failed to upload symbol.");
      }

      onChange({ ...draft, pollVisualSymbolUrl: normalizeBuilderAssetUrl(data.media.path) });
      await onGalleryRefresh();
    } finally {
      setIsUploadingPollSymbol(false);
    }
  }

  async function uploadLevelSymbol(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingLevelSymbol(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("badge", "1");
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: { path?: string }; error?: string }>(
        response,
        "Failed to upload symbol."
      );

      if (!data.media?.path) {
        throw new Error(data.error ?? "Failed to upload symbol.");
      }

      onChange({ ...draft, levelVisualSymbolUrl: normalizeBuilderAssetUrl(data.media.path) });
      await onGalleryRefresh();
    } finally {
      setIsUploadingLevelSymbol(false);
    }
  }

  return (
    <div className="builder-product-editor admin-game-editor admin-game-reward-editor">
      <div className="admin-game-reward-grid">
        <div className="admin-game-reward-definition-column">
          <BuilderSettingRow fullWidth label="Name">
            <input
              className="admin-game-reward-field-medium"
              type="text"
              value={draft.name ?? ""}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder="Grade: First Red"
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Track">
            <select
              className="admin-game-reward-field-select"
              value={draft.achievementLevelName ?? "Grade"}
              onChange={(event) =>
                onChange({
                  ...draft,
                  achievementLevelName: event.target.value as GameLevelName,
                  achievementSublevelName: ""
                })
              }
            >
              {GAME_LEVEL_NAMES.map((levelName) => (
                <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Sublevel">
            <select
              className="admin-game-reward-field-wide"
              value={draft.achievementSublevelName ?? ""}
              onChange={(event) => onChange({ ...draft, achievementSublevelName: event.target.value })}
            >
              <option value="">Select sublevel</option>
              {sublevels.map((sublevel) => (
                <option key={`${sublevel.order}-${sublevel.name}`} value={sublevel.name}>
                  {sublevel.order}. {sublevel.name}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Level">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.levelTier ?? 1}
              onChange={(event) => onChange({ ...draft, levelTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Grade">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.gradeTier ?? 1}
              onChange={(event) => onChange({ ...draft, gradeTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Class">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.classTier ?? 1}
              onChange={(event) => onChange({ ...draft, classTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Points">
            <input
              className="admin-game-reward-field-number"
              min="0"
              type="number"
              value={draft.pointsCost ?? 0}
              onChange={(event) => onChange({ ...draft, pointsCost: Number(event.target.value) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Inventory">
            <input
              className="admin-game-reward-field-number"
              min="0"
              type="number"
              value={draft.inventoryCountText ?? ""}
              onChange={(event) => onChange({ ...draft, inventoryCountText: event.target.value })}
              placeholder="Unlimited"
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Status">
            <select
              className="admin-game-reward-field-select"
              value={draft.status ?? "draft"}
              onChange={(event) => onChange({ ...draft, status: event.target.value as GameRewardStatus })}
            >
              {GAME_REWARD_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Type">
            <select
              className="admin-game-reward-field-select"
              value={selectedRewardType}
              onChange={(event) =>
                onChange({
                  ...draft,
                  rewardType: event.target.value ? (event.target.value as GameRewardType) : undefined
                })
              }
            >
              <option value="">Select Type</option>
              {GAME_REWARD_TYPES.map((type) => (
                <option key={type} value={type}>{rewardTypeLabel(type)}</option>
              ))}
            </select>
          </BuilderSettingRow>
        </div>
        {selectedRewardType ? (
          <>
            {selectedRewardType === "feature" ? (
              <div className="admin-game-reward-style-column">
                <h3>Feature Unlock</h3>
                <BuilderSettingRow fullWidth label="Feature">
                  <select
                    className="admin-game-reward-field-wide"
                    value={draft.featureKey ?? ""}
                    onChange={(event) => onChange({ ...draft, featureKey: event.target.value })}
                  >
                    <option value="">Select feature</option>
                    {progressiveFeatures.map((feature) => (
                      <option key={feature.id} value={feature.featureKey}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </BuilderSettingRow>
                <p className="admin-field-help admin-game-reward-symbol-help">
                  Feature rewards unlock portal capabilities instead of displaying badge styling.
                </p>
              </div>
            ) : null}
            {selectedRewardType !== "feature" ? (
              <>
                <RewardStyleColumn
                  title="Poll-Level Reward"
                  isUploadingSymbol={isUploadingPollSymbol}
                  previewClassName="player-portal-reward-disk"
                  rewardType={selectedRewardType}
                  showSymbol
                  symbolOptions={pollSymbolOptions}
                  values={{
                    visualType: draft.pollVisualType,
                    digitalProduct: draft.pollDigitalProduct,
                    visualColor: draft.pollVisualColor,
                    visualSize: draft.pollVisualSize,
                    visualBorderColor: draft.pollVisualBorderColor,
                    visualBorderWidth: draft.pollVisualBorderWidth,
                    visualSymbolUrl: draft.pollVisualSymbolUrl
                  }}
                  onChange={(next) =>
                    onChange({
                      ...draft,
                      pollVisualType: next.visualType,
                      pollDigitalProduct: next.digitalProduct,
                      pollVisualColor: next.visualColor,
                      pollVisualSize: next.visualSize,
                      pollVisualBorderColor: next.visualBorderColor,
                      pollVisualBorderWidth: next.visualBorderWidth,
                      pollVisualSymbolUrl: next.visualSymbolUrl
                    })
                  }
                  onSymbolFileSelect={(file) => void uploadPollSymbol(file)}
                />
                <RewardStyleColumn
                  title="Level-Level Reward"
                  isUploadingSymbol={isUploadingLevelSymbol}
                  previewClassName="player-portal-level-coin"
                  rewardType={selectedRewardType}
                  showSymbol
                  symbolOptions={levelSymbolOptions}
                  values={{
                    visualType: draft.levelVisualType,
                    digitalProduct: draft.levelDigitalProduct,
                    visualColor: draft.levelVisualColor,
                    visualSize: draft.levelVisualSize,
                    visualBorderColor: draft.levelVisualBorderColor,
                    visualBorderWidth: draft.levelVisualBorderWidth,
                    visualSymbolUrl: draft.levelVisualSymbolUrl
                  }}
                  onChange={(next) =>
                    onChange({
                      ...draft,
                      levelVisualType: next.visualType,
                      levelDigitalProduct: next.digitalProduct,
                      levelVisualColor: next.visualColor,
                      levelVisualSize: next.visualSize,
                      levelVisualBorderColor: next.visualBorderColor,
                      levelVisualBorderWidth: next.visualBorderWidth,
                      levelVisualSymbolUrl: next.visualSymbolUrl
                    })
                  }
                  onSymbolFileSelect={(file) => void uploadLevelSymbol(file)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Reward"}
        </button>
      </div>
    </div>
  );
}

function ScoringRuleEditor({
  draft,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: ScoringRuleDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: ScoringRuleDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field">
          <span>Score name</span>
          <input
            type="text"
            value={draft.scoreName ?? ""}
            onChange={(event) => onChange({ ...draft, scoreName: event.target.value })}
            placeholder="Poll answer"
          />
        </label>
        <label className="field">
          <span>Points</span>
          <input
            min="0"
            type="number"
            value={draft.points ?? 0}
            onChange={(event) => onChange({ ...draft, points: Number(event.target.value) })}
          />
        </label>
        <label className="field admin-game-wide-field">
          <span>Description</span>
          <textarea
            value={draft.description ?? ""}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            rows={3}
          />
        </label>
        <label className="field admin-game-wide-field">
          <span>Specific criteria</span>
          <textarea
            value={draft.specificCriteria ?? ""}
            onChange={(event) => onChange({ ...draft, specificCriteria: event.target.value })}
            placeholder="Define exactly what must happen before points are awarded."
            rows={5}
          />
        </label>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Scoring Rule"}
        </button>
      </div>
    </div>
  );
}

export function AdminGameWorkspace() {
  const [gameLevels, setGameLevels] = useState<GameLevel[]>([]);
  const [eventModules, setEventModules] = useState<GameEventModule[]>([]);
  const [levelUpRules, setLevelUpRules] = useState<GameLevelUpRule[]>([]);
  const [levelEvents, setLevelEvents] = useState<GameLevelEvent[]>([]);
  const [progressiveFeatures, setProgressiveFeatures] = useState<GameProgressiveFeature[]>([]);
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [scoringRules, setScoringRules] = useState<GameScoringRule[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [activeSection, setActiveSection] = useState<GameSection>("levels");
  const [editingGameLevelId, setEditingGameLevelId] = useState("");
  const [editingLevelUpRuleId, setEditingLevelUpRuleId] = useState("");
  const [editingLevelEventId, setEditingLevelEventId] = useState("");
  const [editingProgressiveFeatureId, setEditingProgressiveFeatureId] = useState("");
  const [editingRewardId, setEditingRewardId] = useState("");
  const [editingScoringRuleId, setEditingScoringRuleId] = useState("");
  const [gameLevelDraft, setGameLevelDraft] = useState<GameLevelDraft>(createGameLevelDraft());
  const [levelUpRuleDraft, setLevelUpRuleDraft] = useState<LevelUpRuleDraft>(createLevelUpRuleDraft());
  const [levelEventDraft, setLevelEventDraft] = useState<LevelEventDraft>(createLevelEventDraft());
  const [progressiveFeatureDraft, setProgressiveFeatureDraft] = useState<ProgressiveFeatureDraft>(createProgressiveFeatureDraft());
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(createRewardDraft());
  const [scoringRuleDraft, setScoringRuleDraft] = useState<ScoringRuleDraft>(createScoringRuleDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardSaveDiagnostic, setRewardSaveDiagnostic] = useState<string | null>(null);
  const [gameLevelSortKey, setGameLevelSortKey] = useState<GameLevelSortKey>("levelOrder");
  const [gameLevelSortDirection, setGameLevelSortDirection] = useState<SortDirection>("asc");
  const [rewardSortKey, setRewardSortKey] = useState<RewardSortKey>("levelTier");
  const [rewardSortDirection, setRewardSortDirection] = useState<SortDirection>("asc");
  const [scoringRuleSortKey, setScoringRuleSortKey] = useState<ScoringRuleSortKey>("updatedAt");
  const [scoringRuleSortDirection, setScoringRuleSortDirection] = useState<SortDirection>("desc");
  const [gameLevelNameFilter, setGameLevelNameFilter] = useState<"" | GameLevelName>("");
  const [gameLevelOrderFilter, setGameLevelOrderFilter] = useState("");
  const [gameLevelQuery, setGameLevelQuery] = useState("");
  const [draggedGameLevelId, setDraggedGameLevelId] = useState<string | null>(null);
  const [rewardQuery, setRewardQuery] = useState("");
  const [rewardTypeFilter, setRewardTypeFilter] = useState<"" | GameRewardType>("");
  const [rewardStatusFilter, setRewardStatusFilter] = useState<"" | GameRewardStatus>("");
  const [rewardLevelFilter, setRewardLevelFilter] = useState("");
  const [rewardGradeFilter, setRewardGradeFilter] = useState("");
  const [rewardClassFilter, setRewardClassFilter] = useState("");
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);
  const [rewardBulkAction, setRewardBulkAction] = useState<RewardBulkAction>("levelTier");
  const [bulkPollVisualSize, setBulkPollVisualSize] = useState("20px");
  const [bulkLevelVisualSize, setBulkLevelVisualSize] = useState("42px");
  const [bulkRewardVisualColor, setBulkRewardVisualColor] = useState(DEFAULT_BADGE_BACKGROUND_COLOR);
  const [scoringRuleQuery, setScoringRuleQuery] = useState("");
  const [scoringRuleMinPoints, setScoringRuleMinPoints] = useState("");
  const [scoringRuleMaxPoints, setScoringRuleMaxPoints] = useState("");
  const [levelEventQuery, setLevelEventQuery] = useState("");
  const [levelEventGradeFilter, setLevelEventGradeFilter] = useState("");
  const [levelEventLevelFilter, setLevelEventLevelFilter] = useState("");
  const [levelEventStatusFilter, setLevelEventStatusFilter] = useState<"" | "active" | "draft">("");
  const [levelEventModuleFilter, setLevelEventModuleFilter] = useState("");
  const [levelEventSortKey, setLevelEventSortKey] = useState<LevelEventSortKey>("updatedAt");
  const [levelEventSortDirection, setLevelEventSortDirection] = useState<SortDirection>("desc");

  const filteredGameLevels = useMemo(() => {
    const orderValue = Number.parseInt(gameLevelOrderFilter, 10);
    const hasOrderFilter = Number.isFinite(orderValue);
    const query = gameLevelQuery.trim().toLowerCase();

    return gameLevels.filter((gameLevel) => {
      if (gameLevelNameFilter && gameLevel.levelName !== gameLevelNameFilter) {
        return false;
      }

      if (hasOrderFilter && gameLevel.levelOrder !== orderValue) {
        return false;
      }

      if (query) {
        const haystack = [gameLevel.levelName, formatSublevels(gameLevel.sublevels)]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [gameLevelNameFilter, gameLevelOrderFilter, gameLevelQuery, gameLevels]);

  const filteredRewards = useMemo(() => {
    const query = rewardQuery.trim().toLowerCase();
    const levelFilterValue = Number.parseInt(rewardLevelFilter, 10);
    const gradeFilterValue = Number.parseInt(rewardGradeFilter, 10);
    const classFilterValue = Number.parseInt(rewardClassFilter, 10);
    const hasLevelFilter = Number.isFinite(levelFilterValue) && levelFilterValue > 0;
    const hasGradeFilter = Number.isFinite(gradeFilterValue) && gradeFilterValue > 0;
    const hasClassFilter = Number.isFinite(classFilterValue) && classFilterValue > 0;

    return rewards.filter((reward) => {
      if (rewardTypeFilter && reward.rewardType !== rewardTypeFilter) {
        return false;
      }

      if (rewardStatusFilter && reward.status !== rewardStatusFilter) {
        return false;
      }

      if (hasLevelFilter && getRewardTierValue(reward, "levelTier") !== levelFilterValue) {
        return false;
      }

      if (hasGradeFilter && getRewardTierValue(reward, "gradeTier") !== gradeFilterValue) {
        return false;
      }

      if (hasClassFilter && getRewardTierValue(reward, "classTier") !== classFilterValue) {
        return false;
      }

      if (query) {
        const haystack = [reward.name, reward.description, rewardTypeLabel(reward.rewardType), statusLabel(reward.status)]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [rewardClassFilter, rewardGradeFilter, rewardLevelFilter, rewardQuery, rewardStatusFilter, rewardTypeFilter, rewards]);

  const filteredScoringRules = useMemo(() => {
    const query = scoringRuleQuery.trim().toLowerCase();
    const minPoints = Number.parseInt(scoringRuleMinPoints, 10);
    const maxPoints = Number.parseInt(scoringRuleMaxPoints, 10);
    const hasMinPoints = Number.isFinite(minPoints);
    const hasMaxPoints = Number.isFinite(maxPoints);

    return scoringRules.filter((scoringRule) => {
      if (hasMinPoints && scoringRule.points < minPoints) {
        return false;
      }

      if (hasMaxPoints && scoringRule.points > maxPoints) {
        return false;
      }

      if (query) {
        const haystack = [scoringRule.scoreName, scoringRule.description, scoringRule.specificCriteria]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [scoringRuleMaxPoints, scoringRuleMinPoints, scoringRuleQuery, scoringRules]);

  const sortedGameLevels = useMemo(
    () => [...filteredGameLevels].sort((left, right) => compareGameLevels(left, right, gameLevelSortKey, gameLevelSortDirection)),
    [filteredGameLevels, gameLevelSortDirection, gameLevelSortKey]
  );

  const sortedRewards = useMemo(
    () => [...filteredRewards].sort((left, right) => compareRewards(left, right, rewardSortKey, rewardSortDirection)),
    [filteredRewards, rewardSortDirection, rewardSortKey]
  );
  const rewardLevelOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "levelTier")))).sort((a, b) => a - b),
    [rewards]
  );
  const rewardGradeOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "gradeTier")))).sort((a, b) => a - b),
    [rewards]
  );
  const rewardClassOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "classTier")))).sort((a, b) => a - b),
    [rewards]
  );

  const sortedScoringRules = useMemo(
    () =>
      [...filteredScoringRules].sort((left, right) =>
        compareScoringRules(left, right, scoringRuleSortKey, scoringRuleSortDirection)
      ),
    [filteredScoringRules, scoringRuleSortDirection, scoringRuleSortKey]
  );

  const levelEventGradeOptions = useMemo(
    () =>
      Array.from(new Set(levelEvents.map((event) => getLevelEventProgression(event).gradeTier)))
        .filter((grade) => grade > 0)
        .sort((left, right) => left - right),
    [levelEvents]
  );

  const levelEventLevelOptions = useMemo(
    () =>
      Array.from(new Set(levelEvents.map((event) => getLevelEventProgression(event).levelTier)))
        .filter((level) => level > 0)
        .sort((left, right) => left - right),
    [levelEvents]
  );

  const filteredLevelEvents = useMemo(() => {
    const query = levelEventQuery.trim().toLowerCase();
    const gradeFilterValue = Number.parseInt(levelEventGradeFilter, 10);
    const levelFilterValue = Number.parseInt(levelEventLevelFilter, 10);
    const hasGradeFilter = Number.isFinite(gradeFilterValue) && gradeFilterValue > 0;
    const hasLevelFilter = Number.isFinite(levelFilterValue) && levelFilterValue > 0;

    return levelEvents.filter((event) => {
      const progression = getLevelEventProgression(event);

      if (hasGradeFilter && progression.gradeTier !== gradeFilterValue) {
        return false;
      }

      if (hasLevelFilter && progression.levelTier !== levelFilterValue) {
        return false;
      }

      if (levelEventStatusFilter === "active" && !event.isActive) {
        return false;
      }

      if (levelEventStatusFilter === "draft" && event.isActive) {
        return false;
      }

      if (levelEventModuleFilter && event.moduleId !== levelEventModuleFilter) {
        return false;
      }

      if (query) {
        const targetPolls = eventTargetProgressPolls(event.metadata, event.sublevelName);
        const haystack = [
          event.eventName,
          formatLevelEventMilestoneCompact(event),
          event.moduleName,
          event.isActive ? "active" : "draft",
          String(targetPolls),
          String(progression.gradeTier),
          String(progression.levelTier),
          String(progression.pollTier)
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    levelEventGradeFilter,
    levelEventLevelFilter,
    levelEventModuleFilter,
    levelEventQuery,
    levelEventStatusFilter,
    levelEvents
  ]);

  const sortedLevelEvents = useMemo(
    () =>
      [...filteredLevelEvents].sort((left, right) =>
        compareLevelEvents(left, right, levelEventSortKey, levelEventSortDirection)
      ),
    [filteredLevelEvents, levelEventSortDirection, levelEventSortKey]
  );

  useEffect(() => {
    setSelectedRewardIds((current) => current.filter((id) => rewards.some((reward) => reward.id === id)));
  }, [rewards]);

  const hasGameLevelFilters = Boolean(gameLevelNameFilter || gameLevelOrderFilter.trim() || gameLevelQuery.trim());
  const hasRewardFilters = Boolean(
    rewardQuery.trim() ||
    rewardTypeFilter ||
    rewardStatusFilter ||
    rewardLevelFilter ||
    rewardGradeFilter ||
    rewardClassFilter
  );
  const hasScoringRuleFilters = Boolean(
    scoringRuleQuery.trim() || scoringRuleMinPoints.trim() || scoringRuleMaxPoints.trim()
  );
  const hasLevelEventFilters = Boolean(
    levelEventQuery.trim() ||
    levelEventGradeFilter ||
    levelEventLevelFilter ||
    levelEventStatusFilter ||
    levelEventModuleFilter
  );

  function handleGameLevelSort(nextKey: GameLevelSortKey) {
    if (gameLevelSortKey === nextKey) {
      setGameLevelSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setGameLevelSortKey(nextKey);
    setGameLevelSortDirection("asc");
  }

  function handleRewardSort(nextKey: RewardSortKey) {
    if (rewardSortKey === nextKey) {
      setRewardSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setRewardSortKey(nextKey);
    setRewardSortDirection("asc");
  }

  function handleScoringRuleSort(nextKey: ScoringRuleSortKey) {
    if (scoringRuleSortKey === nextKey) {
      setScoringRuleSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setScoringRuleSortKey(nextKey);
    setScoringRuleSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  function handleLevelEventSort(nextKey: LevelEventSortKey) {
    if (levelEventSortKey === nextKey) {
      setLevelEventSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setLevelEventSortKey(nextKey);
    setLevelEventSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  async function loadGalleryMedia() {
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const data = await readAdminJson<{ media?: AdminMediaItem[]; error?: string }>(
        response,
        "Failed to load media gallery."
      );
      setGalleryMedia((data.media ?? []).filter((item) => item.kind === "image"));
    } catch {
      setGalleryMedia([]);
    }
  }

  async function loadGame() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/game", { cache: "no-store" });
      const data = await readAdminJson<GameSnapshot & { error?: string }>(response, "Failed to load game settings.");
      setGameLevels(data.gameLevels ?? []);
      setEventModules(data.eventModules ?? []);
      setLevelUpRules(data.levelUpRules ?? []);
      setLevelEvents(data.levelEvents ?? []);
      setProgressiveFeatures(data.progressiveFeatures ?? []);
      setRewards(data.rewards ?? []);
      setScoringRules(data.scoringRules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load game settings.");
      setGameLevels([]);
      setEventModules([]);
      setLevelUpRules([]);
      setLevelEvents([]);
      setProgressiveFeatures([]);
      setRewards([]);
      setScoringRules([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGame();
    void loadGalleryMedia();
  }, []);

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  function startNewGameLevel() {
    resetMessages();
    setActiveSection("levels");
    setEditingGameLevelId("new");
    setGameLevelDraft(createGameLevelDraft());
  }

  function startNewLevelUpRule() {
    resetMessages();
    setActiveSection("level-up");
    setEditingLevelUpRuleId("new");
    setLevelUpRuleDraft(createLevelUpRuleDraft(gameLevels, scoringRules));
  }

  function startNewLevelEvent() {
    resetMessages();
    if (eventModules.length === 0) {
      setError("No game-triggered Special Effects or Speech Bubble modules found. Save a module with Trigger set to Game first.");
      setEditingLevelEventId("");
      return;
    }

    setActiveSection("level-up");
    setEditingLevelEventId("new");
    setLevelEventDraft(createLevelEventDraft(gameLevels, eventModules));
  }

  function startNewProgressiveFeature() {
    resetMessages();
    setActiveSection("level-up");
    setEditingProgressiveFeatureId("new");
    setProgressiveFeatureDraft(createProgressiveFeatureDraft(gameLevels));
  }

  function startNewReward() {
    resetMessages();
    setActiveSection("redemptions");
    setEditingRewardId("new");
    setRewardDraft(createRewardDraft());
  }

  function startNewScoringRule() {
    resetMessages();
    setActiveSection("scoring");
    setEditingScoringRuleId("new");
    setScoringRuleDraft(createScoringRuleDraft());
  }

  async function saveGameLevel() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        gameLevelDraft.id ? `/api/admin/game/levels/${gameLevelDraft.id}` : "/api/admin/game/levels",
        {
          method: gameLevelDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            levelName: gameLevelDraft.levelName,
            levelOrder: gameLevelDraft.levelOrder,
            sublevels: gameLevelDraft.sublevels ?? []
          })
        }
      );
      const data = await readAdminJson<{ gameLevel?: GameLevel; error?: string }>(
        response,
        "Failed to save progression track."
      );

      if (!data.gameLevel) {
        throw new Error(data.error ?? "Failed to save progression track.");
      }

      setGameLevels((current) =>
        gameLevelDraft.id
          ? current.map((item) => (item.id === data.gameLevel!.id ? data.gameLevel! : item))
          : [...current, data.gameLevel!]
      );
      setMessage(`Saved ${formatGameLevelName(data.gameLevel.levelName)}.`);
      setEditingGameLevelId("");
      setGameLevelDraft(createGameLevelDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save progression track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLevelUpRule() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        levelUpRuleDraft.id ? `/api/admin/game/level-up/${levelUpRuleDraft.id}` : "/api/admin/game/level-up",
        {
          method: levelUpRuleDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            levelName: levelUpRuleDraft.levelName,
            sublevelName: levelUpRuleDraft.sublevelName,
            criteria: levelUpRuleDraft.criteria ?? [],
            isActive: levelUpRuleDraft.isActive !== false
          })
        }
      );
      const data = await readAdminJson<{ levelUpRule?: GameLevelUpRule; error?: string }>(
        response,
        "Failed to save level up rule."
      );

      if (!data.levelUpRule) {
        throw new Error(data.error ?? "Failed to save level up rule.");
      }

      setLevelUpRules((current) =>
        levelUpRuleDraft.id
          ? current.map((item) => (item.id === data.levelUpRule!.id ? data.levelUpRule! : item))
          : [data.levelUpRule!, ...current]
      );
      setMessage(`Saved level up rule for ${formatGameLevelName(data.levelUpRule.levelName)}: ${data.levelUpRule.sublevelName}.`);
      setEditingLevelUpRuleId("");
      setLevelUpRuleDraft(createLevelUpRuleDraft(gameLevels, scoringRules));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save level up rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProgressiveFeature() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        progressiveFeatureDraft.id
          ? `/api/admin/game/progressive-features/${progressiveFeatureDraft.id}`
          : "/api/admin/game/progressive-features",
        {
          method: progressiveFeatureDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featureKey: progressiveFeatureDraft.featureKey,
            name: progressiveFeatureDraft.name,
            description: progressiveFeatureDraft.description,
            unlockLevelName: progressiveFeatureDraft.unlockLevelName,
            unlockSublevelName: progressiveFeatureDraft.unlockSublevelName,
            isActive: progressiveFeatureDraft.isActive !== false,
            metadata: progressiveFeatureDraft.metadata ?? {}
          })
        }
      );
      const data = await readAdminJson<{ progressiveFeature?: GameProgressiveFeature; error?: string }>(
        response,
        "Failed to save progressive feature."
      );

      if (!data.progressiveFeature) {
        throw new Error(data.error ?? "Failed to save progressive feature.");
      }

      setProgressiveFeatures((current) =>
        progressiveFeatureDraft.id
          ? current.map((item) => (item.id === data.progressiveFeature!.id ? data.progressiveFeature! : item))
          : [data.progressiveFeature!, ...current]
      );
      setMessage(`Saved progressive feature "${data.progressiveFeature.name}".`);
      setEditingProgressiveFeatureId("");
      setProgressiveFeatureDraft(createProgressiveFeatureDraft(gameLevels));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save progressive feature.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLevelEvent() {
    setIsSaving(true);
    resetMessages();

    const payload = applyProgressionToLevelEventDraft(levelEventDraft);

    try {
      const response = await fetch(
        payload.id ? `/api/admin/game/events/${payload.id}` : "/api/admin/game/events",
        {
          method: payload.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: payload.eventName,
            levelName: payload.levelName,
            sublevelName: payload.sublevelName,
            moduleId: payload.moduleId,
            trigger: "game",
            audience: payload.audience ?? "both",
            isActive: payload.isActive !== false,
            metadata: payload.metadata ?? { eventType: "confetti" }
          })
        }
      );
      const data = await readAdminJson<{ levelEvent?: GameLevelEvent; error?: string }>(
        response,
        "Failed to save event."
      );

      if (!data.levelEvent) {
        throw new Error(data.error ?? "Failed to save event.");
      }

      setLevelEvents((current) =>
        payload.id
          ? current.map((item) => (item.id === data.levelEvent!.id ? data.levelEvent! : item))
          : [data.levelEvent!, ...current]
      );
      setMessage(`Saved event "${data.levelEvent.eventName}".`);
      setEditingLevelEventId("");
      setLevelEventDraft(createLevelEventDraft(gameLevels, eventModules));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReward() {
    setIsSaving(true);
    resetMessages();
    setRewardSaveDiagnostic("Saving reward...");

    try {
      const payload = rewardToPayload(rewardDraft);
      const response = await fetch(rewardDraft.id ? `/api/admin/game/rewards/${rewardDraft.id}` : "/api/admin/game/rewards", {
        method: rewardDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setRewardSaveDiagnostic(
        `POST /api/admin/game/rewards returned ${response.status}. Type=${payload.rewardType ?? "(blank)"}, Status=${payload.status ?? "(blank)"}.`
      );
      const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to save reward.");

      if (!data.reward) {
        throw new Error(data.error ?? "Failed to save reward.");
      }

      setRewards((current) =>
        rewardDraft.id ? current.map((item) => (item.id === data.reward!.id ? data.reward! : item)) : [data.reward!, ...current]
      );
      setMessage(`Saved reward "${data.reward.name}".`);
      setRewardSaveDiagnostic(`Saved reward "${data.reward.name}" (${data.reward.id}).`);
      setEditingRewardId("");
      setRewardDraft(createRewardDraft());
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : "Failed to save reward.";
      setRewardSaveDiagnostic(`Reward save failed: ${saveMessage}`);
      setError(saveMessage);
    } finally {
      setIsSaving(false);
    }
  }

  async function cloneReward(reward: GameReward) {
    setIsSaving(true);
    resetMessages();
    setRewardSaveDiagnostic(`Cloning reward "${reward.name}"...`);

    try {
      const payload = rewardToPayload(reward, {
        name: `${reward.name} (copy)`,
        status: reward.status
      });
      const response = await fetch("/api/admin/game/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to clone reward.");

      if (!data.reward) {
        throw new Error(data.error ?? "Failed to clone reward.");
      }

      setRewards((current) => [data.reward!, ...current]);
      setMessage(`Cloned reward "${reward.name}".`);
      setRewardSaveDiagnostic(`Cloned reward as "${data.reward.name}" (${data.reward.id}).`);
      setEditingRewardId("");
      setRewardDraft(createRewardDraft());
    } catch (cloneError) {
      const cloneMessage = cloneError instanceof Error ? cloneError.message : "Failed to clone reward.";
      setRewardSaveDiagnostic(`Reward clone failed: ${cloneMessage}`);
      setError(cloneMessage);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleRewardSelection(rewardId: string, checked: boolean) {
    setSelectedRewardIds((current) => {
      if (checked) {
        return current.includes(rewardId) ? current : [...current, rewardId];
      }

      return current.filter((id) => id !== rewardId);
    });
  }

  function toggleAllVisibleRewards(checked: boolean) {
    if (!checked) {
      setSelectedRewardIds((current) => current.filter((id) => !sortedRewards.some((reward) => reward.id === id)));
      return;
    }

    const visibleIds = sortedRewards.map((reward) => reward.id);
    setSelectedRewardIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function copySelectedRewardsToNextTier() {
    if (!isRewardTierBulkAction(rewardBulkAction)) {
      return;
    }

    const tierTarget = rewardBulkAction;
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to copy.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic("Copying selected rewards...");

    try {
      const createdRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const currentTierValue = getRewardTierValue(reward, tierTarget);
        const payload = rewardToPayload(reward, {
          metadata: {
            ...reward.metadata,
            [tierTarget]: currentTierValue + 1
          }
        });

        const response = await fetch("/api/admin/game/rewards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to copy rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to copy rewards.");
        }

        createdRewards.push(data.reward);
      }

      setRewards((current) => [...createdRewards, ...current]);
      setSelectedRewardIds([]);
      setMessage(`Copied ${createdRewards.length} reward${createdRewards.length === 1 ? "" : "s"} to next ${tierTarget === "levelTier" ? "level" : tierTarget === "gradeTier" ? "grade" : "class"}.`);
      setRewardSaveDiagnostic(`Copied ${createdRewards.length} reward${createdRewards.length === 1 ? "" : "s"}.`);
    } catch (copyError) {
      const copyMessage = copyError instanceof Error ? copyError.message : "Failed to copy rewards.";
      setError(copyMessage);
      setRewardSaveDiagnostic(`Reward copy failed: ${copyMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkRewardSizeUpdate(target: "pollReward" | "levelReward") {
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to update.");
      return;
    }

    const size = (target === "pollReward" ? bulkPollVisualSize : bulkLevelVisualSize).trim();
    const targetLabel = target === "pollReward" ? "Poll-Level" : "Level-Level";

    if (!size) {
      setError(`Enter a ${targetLabel.toLowerCase()} disk size.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic(`Updating ${targetLabel} size on selected rewards...`);

    try {
      const updatedRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const payload = rewardToPayload(reward, {
          metadata: buildBulkRewardSingleSizeMetadata(reward, target, size)
        });

        const response = await fetch(`/api/admin/game/rewards/${reward.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to update rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to update rewards.");
        }

        updatedRewards.push(data.reward);
      }

      const updatedById = new Map(updatedRewards.map((reward) => [reward.id, reward]));
      setRewards((current) => current.map((reward) => updatedById.get(reward.id) ?? reward));
      setMessage(
        `Updated ${targetLabel} disk size to ${size} on ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`
      );
      setRewardSaveDiagnostic(`Updated ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
    } catch (updateError) {
      const updateMessage = updateError instanceof Error ? updateError.message : "Failed to update rewards.";
      setError(updateMessage);
      setRewardSaveDiagnostic(`Reward bulk update failed: ${updateMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkRewardColorUpdate() {
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to update.");
      return;
    }

    const nextColor = bulkRewardVisualColor;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic("Updating disk color on selected rewards...");

    try {
      const updatedRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const payload = rewardToPayload(reward, {
          metadata: buildBulkRewardColorMetadata(reward, nextColor)
        });

        const response = await fetch(`/api/admin/game/rewards/${reward.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to update rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to update rewards.");
        }

        updatedRewards.push(data.reward);
      }

      const updatedById = new Map(updatedRewards.map((reward) => [reward.id, reward]));
      setRewards((current) => current.map((reward) => updatedById.get(reward.id) ?? reward));
      setMessage(`Updated disk color on ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
      setRewardSaveDiagnostic(`Updated ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
    } catch (updateError) {
      const updateMessage = updateError instanceof Error ? updateError.message : "Failed to update rewards.";
      setError(updateMessage);
      setRewardSaveDiagnostic(`Reward bulk update failed: ${updateMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveScoringRule() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        scoringRuleDraft.id ? `/api/admin/game/scoring/${scoringRuleDraft.id}` : "/api/admin/game/scoring",
        {
          method: scoringRuleDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreName: scoringRuleDraft.scoreName,
            description: scoringRuleDraft.description,
            specificCriteria: scoringRuleDraft.specificCriteria,
            points: scoringRuleDraft.points
          })
        }
      );
      const data = await readAdminJson<{ scoringRule?: GameScoringRule; error?: string }>(
        response,
        "Failed to save scoring rule."
      );

      if (!data.scoringRule) {
        throw new Error(data.error ?? "Failed to save scoring rule.");
      }

      setScoringRules((current) =>
        scoringRuleDraft.id
          ? current.map((item) => (item.id === data.scoringRule!.id ? data.scoringRule! : item))
          : [data.scoringRule!, ...current]
      );
      setMessage(`Saved scoring rule "${data.scoringRule.scoreName}".`);
      setEditingScoringRuleId("");
      setScoringRuleDraft(createScoringRuleDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save scoring rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGameLevel(gameLevel: GameLevel) {
    if (!window.confirm(`Delete ${formatGameLevelName(gameLevel.levelName)} order ${gameLevel.levelOrder}?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/levels/${gameLevel.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete progression track.");
      setGameLevels((current) => current.filter((item) => item.id !== gameLevel.id));
      setMessage(`Deleted ${formatGameLevelName(gameLevel.levelName)}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete progression track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLevelUpRule(rule: GameLevelUpRule) {
    if (!window.confirm(`Delete level up rule for ${formatGameLevelName(rule.levelName)}: ${rule.sublevelName}?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/level-up/${rule.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete level up rule.");
      setLevelUpRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage(`Deleted level up rule for ${formatGameLevelName(rule.levelName)}: ${rule.sublevelName}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete level up rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProgressiveFeature(feature: GameProgressiveFeature) {
    if (!window.confirm(`Delete progressive feature "${feature.name}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/progressive-features/${feature.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete progressive feature.");
      setProgressiveFeatures((current) => current.filter((item) => item.id !== feature.id));
      setMessage(`Deleted progressive feature "${feature.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete progressive feature.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cloneLevelEvent(event: GameLevelEvent) {
    setIsSaving(true);
    resetMessages();

    try {
      const payload = applyProgressionToLevelEventDraft({
        ...levelEventToDraft(event),
        eventName: `${event.eventName} (copy)`
      });
      const response = await fetch("/api/admin/game/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: payload.eventName,
          levelName: payload.levelName,
          sublevelName: payload.sublevelName,
          moduleId: payload.moduleId,
          trigger: "game",
          isActive: payload.isActive !== false,
          metadata: payload.metadata ?? { eventType: "confetti" }
        })
      });
      const data = await readAdminJson<{ levelEvent?: GameLevelEvent; error?: string }>(
        response,
        "Failed to clone event."
      );

      if (!data.levelEvent) {
        throw new Error(data.error ?? "Failed to clone event.");
      }

      setLevelEvents((current) => [data.levelEvent!, ...current]);
      setMessage(`Cloned event "${event.eventName}".`);
      setEditingLevelEventId("");
      setLevelEventDraft(createLevelEventDraft(gameLevels, eventModules));
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : "Failed to clone event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleLevelEventPlayerVisibility(event: GameLevelEvent) {
    const nextActive = !event.isActive;

    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: event.eventName,
          levelName: event.levelName,
          sublevelName: event.sublevelName,
          moduleId: event.moduleId,
          trigger: event.trigger,
          isActive: nextActive,
          metadata: event.metadata ?? { eventType: "confetti" }
        })
      });
      const data = await readAdminJson<{ levelEvent?: GameLevelEvent; error?: string }>(
        response,
        "Failed to update event visibility."
      );

      if (!data.levelEvent) {
        throw new Error(data.error ?? "Failed to update event visibility.");
      }

      setLevelEvents((current) =>
        current.map((item) => (item.id === data.levelEvent!.id ? data.levelEvent! : item))
      );

      if (editingLevelEventId === event.id) {
        setLevelEventDraft(levelEventToDraft(data.levelEvent));
      }

      setMessage(
        nextActive
          ? `"${event.eventName}" is visible to players on the site and portal.`
          : `"${event.eventName}" is hidden from players (still editable here as Draft).`
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "Failed to update event visibility."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLevelEvent(event: GameLevelEvent) {
    if (!window.confirm(`Delete event "${event.eventName}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/events/${event.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete event.");
      setLevelEvents((current) => current.filter((item) => item.id !== event.id));
      setMessage(`Deleted event "${event.eventName}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function persistGameLevelOrder(nextLevels: GameLevel[]) {
    setIsSaving(true);
    resetMessages();

    try {
      const orderedLevels = nextLevels
        .slice()
        .sort((left, right) => left.levelOrder - right.levelOrder)
        .map((gameLevel, index) => ({ ...gameLevel, levelOrder: index + 1 }));
      const response = await fetch("/api/admin/game/levels/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levels: orderedLevels.map((gameLevel) => ({
            id: gameLevel.id,
            levelOrder: gameLevel.levelOrder
          }))
        })
      });
      const data = await readAdminJson<{ gameLevels?: GameLevel[]; error?: string }>(
        response,
        "Failed to reorder progression tracks."
      );

      setGameLevels(data.gameLevels ?? orderedLevels);
      setGameLevelSortKey("levelOrder");
      setGameLevelSortDirection("asc");
      setMessage("Updated progression track order.");
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder progression tracks.");
    } finally {
      setIsSaving(false);
    }
  }

  function moveGameLevel(gameLevelId: string, direction: -1 | 1) {
    const orderedLevels = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder);
    const sourceIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === gameLevelId);
    const targetIndex = sourceIndex + direction;

    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= orderedLevels.length) {
      return;
    }

    void persistGameLevelOrder(reorderItems(orderedLevels, sourceIndex, targetIndex));
  }

  function handleGameLevelDragStart(event: DragEvent<HTMLTableRowElement>, gameLevelId: string) {
    event.dataTransfer.setData("application/normie-game-level-id", gameLevelId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedGameLevelId(gameLevelId);
  }

  function handleGameLevelDragOver(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleGameLevelDrop(event: DragEvent<HTMLTableRowElement>, targetGameLevelId: string) {
    event.preventDefault();
    const sourceGameLevelId = event.dataTransfer.getData("application/normie-game-level-id") || draggedGameLevelId;
    setDraggedGameLevelId(null);

    if (!sourceGameLevelId || sourceGameLevelId === targetGameLevelId) {
      return;
    }

    const orderedLevels = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder);
    const sourceIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === sourceGameLevelId);
    const targetIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === targetGameLevelId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    void persistGameLevelOrder(reorderItems(orderedLevels, sourceIndex, targetIndex));
  }

  async function deleteReward(reward: GameReward) {
    if (!window.confirm(`Delete reward "${reward.name}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/rewards/${reward.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete reward.");
      setRewards((current) => current.filter((item) => item.id !== reward.id));
      setMessage(`Deleted reward "${reward.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete reward.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteScoringRule(scoringRule: GameScoringRule) {
    if (!window.confirm(`Delete scoring rule "${scoringRule.scoreName}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/scoring/${scoringRule.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete scoring rule.");
      setScoringRules((current) => current.filter((item) => item.id !== scoringRule.id));
      setMessage(`Deleted scoring rule "${scoringRule.scoreName}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete scoring rule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Game</div>
            <h2>Engagement Engine</h2>
            <p className="page-copy admin-copy">
              Manage progression tiers and point rewards for the Normie player layer.
            </p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" disabled={isLoading} onClick={() => void loadGame()} type="button">
              Refresh
            </button>
          </div>
        </div>
        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}
        <div className="admin-game-tile-grid">
          {GAME_SECTION_TILES.map((tile) => (
            <button
              className={`admin-game-tile${activeSection === tile.key ? " is-active" : ""}`}
              key={tile.key}
              onClick={() => setActiveSection(tile.key)}
              type="button"
            >
              <strong>{tile.label}</strong>
              <span>{tile.description}</span>
            </button>
          ))}
        </div>
      </section>

      {activeSection === "levels" ? (
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Progression</div>
            <h2>Progression Tracks</h2>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewGameLevel} type="button">
            New Progression Track
          </button>
        </div>
        {editingGameLevelId === "new" ? (
          <GameLevelEditor
            draft={gameLevelDraft}
            isSaving={isSaving}
            onCancel={() => setEditingGameLevelId("")}
            onChange={setGameLevelDraft}
            onSave={() => void saveGameLevel()}
          />
        ) : null}
        <div className="admin-products-filter-bar admin-game-filter-bar">
          <label className="field">
            <span>Progression Track</span>
            <select
              value={gameLevelNameFilter}
              onChange={(event) => setGameLevelNameFilter(event.target.value as "" | GameLevelName)}
            >
              <option value="">All names</option>
              {GAME_LEVEL_NAMES.map((levelName) => (
                <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Track Order</span>
            <select
              value={gameLevelOrderFilter}
              onChange={(event) => setGameLevelOrderFilter(event.target.value)}
            >
              <option value="">All orders</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((levelOrder) => (
                <option key={levelOrder} value={levelOrder}>{levelOrder}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sublevels</span>
            <input
              type="search"
              value={gameLevelQuery}
              onChange={(event) => setGameLevelQuery(event.target.value)}
              placeholder="Filter sublevels"
            />
          </label>
        </div>
        {hasGameLevelFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedGameLevels.length} of {gameLevels.length} progression tracks
          </p>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                {GAME_LEVEL_TABLE_COLUMNS.map((column) => (
                  <th key={column.key}>
                    <AdminTableSortButton
                      activeSortKey={gameLevelSortKey}
                      label={column.label}
                      onSort={handleGameLevelSort}
                      sortDirection={gameLevelSortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGameLevels.map((gameLevel) => {
                const orderedIndex = gameLevels
                  .slice()
                  .sort((left, right) => left.levelOrder - right.levelOrder)
                  .findIndex((item) => item.id === gameLevel.id);

                return (
                <tr
                  className={draggedGameLevelId === gameLevel.id ? "admin-game-draggable-row is-dragging" : "admin-game-draggable-row"}
                  draggable
                  key={gameLevel.id}
                  onDragEnd={() => setDraggedGameLevelId(null)}
                  onDragOver={handleGameLevelDragOver}
                  onDragStart={(event) => handleGameLevelDragStart(event, gameLevel.id)}
                  onDrop={(event) => handleGameLevelDrop(event, gameLevel.id)}
                >
                  <td>
                    <div className="admin-game-level-name-cell">
                      <span className="admin-game-drag-handle" title="Drag to reorder">⋮⋮</span>
                      <strong>{formatGameLevelName(gameLevel.levelName)}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="admin-game-order-cell">
                      <span>{gameLevel.levelOrder}</span>
                      <button
                        aria-label="Move progression track up"
                        className="polls-icon-button"
                        disabled={isSaving || orderedIndex <= 0}
                        onClick={() => moveGameLevel(gameLevel.id, -1)}
                        title="Move up"
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Move progression track down"
                        className="polls-icon-button"
                        disabled={isSaving || orderedIndex === gameLevels.length - 1}
                        onClick={() => moveGameLevel(gameLevel.id, 1)}
                        title="Move down"
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    {gameLevel.sublevels.length
                      ? formatSublevels(gameLevel.sublevels)
                      : <span className="admin-table-empty">None</span>}
                  </td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label="Edit progression track"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingGameLevelId(gameLevel.id);
                          setGameLevelDraft(gameLevelToDraft(gameLevel));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete progression track"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteGameLevel(gameLevel)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {sortedGameLevels.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={4}>
                    {isLoading
                      ? "Loading progression tracks..."
                      : gameLevels.length === 0
                        ? "No progression tracks found."
                        : "No progression tracks match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingGameLevelId && editingGameLevelId !== "new" ? (
          <GameLevelEditor
            draft={gameLevelDraft}
            isSaving={isSaving}
            onCancel={() => setEditingGameLevelId("")}
            onChange={setGameLevelDraft}
            onSave={() => void saveGameLevel()}
          />
        ) : null}
        <button
          aria-label="Add progression track"
          className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
          disabled={isSaving}
          onClick={startNewGameLevel}
          title="Add progression track"
          type="button"
        >
          +
        </button>
      </section>
      ) : null}

      {activeSection === "level-up" ? (
      <>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Progression Logic</div>
            <h2>Level Up</h2>
          </div>
          <button className="submit-button" disabled={isSaving || gameLevels.length === 0 || scoringRules.length === 0} onClick={startNewLevelUpRule} type="button">
            New Level Up Rule
          </button>
        </div>
        {editingLevelUpRuleId === "new" ? (
          <LevelUpRuleEditor
            draft={levelUpRuleDraft}
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingLevelUpRuleId("")}
            onChange={setLevelUpRuleDraft}
            onSave={() => void saveLevelUpRule()}
            scoringRules={scoringRules}
          />
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Sublevel</th>
                <th>Criteria</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {levelUpRules.map((rule) => (
                <tr key={rule.id}>
                  <td><strong>{formatGameLevelName(rule.levelName)}</strong></td>
                  <td>{rule.sublevelName}</td>
                  <td>{formatLevelUpCriteria(rule, scoringRules)}</td>
                  <td>{rule.isActive ? "Active" : "Draft"}</td>
                  <td>{formatTemplateTimestamp(rule.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label="Edit level up rule"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingLevelUpRuleId(rule.id);
                          setLevelUpRuleDraft(levelUpRuleToDraft(rule));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete level up rule"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteLevelUpRule(rule)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {levelUpRules.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading
                      ? "Loading level up rules..."
                      : "No level up rules found. Create one to define graduation criteria."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingLevelUpRuleId && editingLevelUpRuleId !== "new" ? (
          <LevelUpRuleEditor
            draft={levelUpRuleDraft}
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingLevelUpRuleId("")}
            onChange={setLevelUpRuleDraft}
            onSave={() => void saveLevelUpRule()}
            scoringRules={scoringRules}
          />
        ) : null}
        <button
          aria-label="Add level up rule"
          className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
          disabled={isSaving || gameLevels.length === 0 || scoringRules.length === 0}
          onClick={startNewLevelUpRule}
          title="Add level up rule"
          type="button"
        >
          +
        </button>
      </section>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Feature Unlocks</div>
            <h2>Progressive Features</h2>
            <p className="admin-section-intro">
              Define player features that become available after a progression milestone.
            </p>
          </div>
          <button className="submit-button" disabled={isSaving || gameLevels.length === 0} onClick={startNewProgressiveFeature} type="button">
            New Feature
          </button>
        </div>
        {editingProgressiveFeatureId === "new" ? (
          <ProgressiveFeatureEditor
            draft={progressiveFeatureDraft}
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingProgressiveFeatureId("")}
            onChange={setProgressiveFeatureDraft}
            onSave={() => void saveProgressiveFeature()}
          />
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Key</th>
                <th>Unlocks At</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {progressiveFeatures.map((feature) => (
                <tr key={feature.id}>
                  <td>
                    <strong>{feature.name}</strong>
                    {feature.description ? <div className="admin-table-subcopy">{feature.description}</div> : null}
                  </td>
                  <td><code>{feature.featureKey}</code></td>
                  <td>{formatGameLevelName(feature.unlockLevelName)}: {feature.unlockSublevelName || "Any"}</td>
                  <td>{feature.isActive ? "Active" : "Draft"}</td>
                  <td>{formatTemplateTimestamp(feature.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label="Edit progressive feature"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingProgressiveFeatureId(feature.id);
                          setProgressiveFeatureDraft(progressiveFeatureToDraft(feature));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete progressive feature"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteProgressiveFeature(feature)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {progressiveFeatures.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading ? "Loading progressive features..." : "No progressive features found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingProgressiveFeatureId && editingProgressiveFeatureId !== "new" ? (
          <ProgressiveFeatureEditor
            draft={progressiveFeatureDraft}
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingProgressiveFeatureId("")}
            onChange={setProgressiveFeatureDraft}
            onSave={() => void saveProgressiveFeature()}
          />
        ) : null}
        <button
          aria-label="Add progressive feature"
          className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
          disabled={isSaving || gameLevels.length === 0}
          onClick={startNewProgressiveFeature}
          title="Add progressive feature"
          type="button"
        >
          +
        </button>
      </section>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Completion Effects</div>
            <h2>Events</h2>
            <p className="admin-section-intro">
              Define one-time effects that fire after a specific progress poll. Use Grade, Level, and Poll to target milestones; Polls Per Level defaults to 10.
            </p>
          </div>
          <button className="submit-button" disabled={isSaving || eventModules.length === 0} onClick={startNewLevelEvent} type="button">
            New Event
          </button>
        </div>
        {editingLevelEventId === "new" ? (
          <LevelEventEditor
            draft={levelEventDraft}
            eventModules={eventModules}
            isSaving={isSaving}
            onCancel={() => setEditingLevelEventId("")}
            onChange={setLevelEventDraft}
            onSave={() => void saveLevelEvent()}
          />
        ) : null}
        <div className="admin-products-filter-bar admin-game-filter-bar">
          <label className="field">
            <span>Event</span>
            <input
              type="search"
              value={levelEventQuery}
              onChange={(event) => setLevelEventQuery(event.target.value)}
              placeholder="Filter events"
            />
          </label>
          <label className="field">
            <span>Grade</span>
            <select
              value={levelEventGradeFilter}
              onChange={(event) => setLevelEventGradeFilter(event.target.value)}
            >
              <option value="">All grades</option>
              {levelEventGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select
              value={levelEventLevelFilter}
              onChange={(event) => setLevelEventLevelFilter(event.target.value)}
            >
              <option value="">All levels</option>
              {levelEventLevelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={levelEventStatusFilter}
              onChange={(event) => setLevelEventStatusFilter(event.target.value as "" | "active" | "draft")}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="field">
            <span>Module</span>
            <select
              value={levelEventModuleFilter}
              onChange={(event) => setLevelEventModuleFilter(event.target.value)}
            >
              <option value="">All modules</option>
              {eventModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasLevelEventFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedLevelEvents.length} of {levelEvents.length} events
          </p>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                {LEVEL_EVENT_TABLE_COLUMNS.map((column) => (
                  <th key={column.key}>
                    <AdminTableSortButton
                      activeSortKey={levelEventSortKey}
                      label={column.label}
                      onSort={handleLevelEventSort}
                      sortDirection={levelEventSortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLevelEvents.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.eventName}</strong></td>
                  <td>
                    <strong>{formatLevelEventMilestoneCompact(event)}</strong>
                  </td>
                  <td className="admin-game-level-event-poll-cell">{levelEventProgressPolls(event)}</td>
                  <td>{event.moduleName || "No module selected"}</td>
                  <td>{event.isActive ? "Active" : "Draft"}</td>
                  <td>{formatTemplateTimestamp(event.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label={
                          event.isActive
                            ? "Hide event from players"
                            : "Show event to players"
                        }
                        className="polls-icon-button polls-icon-button-view"
                        disabled={isSaving}
                        onClick={() => void toggleLevelEventPlayerVisibility(event)}
                        title={event.isActive ? "Hide on Site" : "Show on Site"}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            event.isActive ? "polls-icon-glyph-eye-hidden" : "polls-icon-glyph-eye"
                          }
                        />
                      </button>
                      <button
                        aria-label="Edit level event"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingLevelEventId(event.id);
                          setLevelEventDraft(levelEventToDraft(event));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Clone event"
                        className="polls-icon-button polls-icon-button-view"
                        disabled={isSaving}
                        onClick={() => void cloneLevelEvent(event)}
                        title="Clone"
                        type="button"
                      >
                        ⧉
                      </button>
                      <button
                        aria-label="Delete level event"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteLevelEvent(event)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedLevelEvents.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={LEVEL_EVENT_TABLE_COLUMNS.length + 1}>
                    {isLoading
                      ? "Loading events..."
                      : levelEvents.length === 0
                        ? eventModules.length === 0
                          ? "No game-triggered Special Effects or Speech Bubble modules found. Save a module with Trigger set to Game first."
                          : "No events found."
                        : "No events match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingLevelEventId && editingLevelEventId !== "new" ? (
          <LevelEventEditor
            draft={levelEventDraft}
            eventModules={eventModules}
            isSaving={isSaving}
            onCancel={() => setEditingLevelEventId("")}
            onChange={setLevelEventDraft}
            onSave={() => void saveLevelEvent()}
          />
        ) : null}
        <button
          aria-label="Add event"
          className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
          disabled={isSaving || gameLevels.length === 0 || eventModules.length === 0}
          onClick={startNewLevelEvent}
          title="Add event"
          type="button"
        >
          +
        </button>
      </section>
      </>
      ) : null}

      {activeSection === "redemptions" ? (
      <>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Rewards & Redemptions</div>
            <h2>Rewards</h2>
            <p className="admin-section-intro">
              Define the achievement rewards players earn as they graduate through progression tracks and sublevels.
            </p>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewReward} type="button">
            New Reward
          </button>
        </div>
        {editingRewardId === "new" ? (
          <RewardEditor
            draft={rewardDraft}
            galleryMedia={galleryMedia}
            gameLevels={gameLevels}
            progressiveFeatures={progressiveFeatures}
            rewards={rewards}
            isSaving={isSaving}
            onCancel={() => setEditingRewardId("")}
            onChange={setRewardDraft}
            onSave={() => void saveReward()}
            onGalleryRefresh={loadGalleryMedia}
          />
        ) : null}
        <div className="admin-products-filter-bar admin-game-filter-bar">
          <label className="field">
            <span>Reward</span>
            <input
              type="search"
              value={rewardQuery}
              onChange={(event) => setRewardQuery(event.target.value)}
              placeholder="Filter rewards"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={rewardTypeFilter}
              onChange={(event) => setRewardTypeFilter(event.target.value as "" | GameRewardType)}
            >
              <option value="">All types</option>
              {GAME_REWARD_TYPES.map((type) => (
                <option key={type} value={type}>{rewardTypeLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={rewardStatusFilter}
              onChange={(event) => setRewardStatusFilter(event.target.value as "" | GameRewardStatus)}
            >
              <option value="">All statuses</option>
              {GAME_REWARD_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select
              value={rewardLevelFilter}
              onChange={(event) => setRewardLevelFilter(event.target.value)}
            >
              <option value="">All levels</option>
              {rewardLevelOptions.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Grade</span>
            <select
              value={rewardGradeFilter}
              onChange={(event) => setRewardGradeFilter(event.target.value)}
            >
              <option value="">All grades</option>
              {rewardGradeOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Class</span>
            <select
              value={rewardClassFilter}
              onChange={(event) => setRewardClassFilter(event.target.value)}
            >
              <option value="">All classes</option>
              {rewardClassOptions.map((classValue) => (
                <option key={classValue} value={classValue}>{classValue}</option>
              ))}
            </select>
          </label>
        </div>
        {hasRewardFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedRewards.length} of {rewards.length} rewards
          </p>
        ) : null}
        <div className="admin-game-reward-bulk-bar">
          <p className="admin-game-reward-bulk-selection">
            {selectedRewardIds.length
              ? `${selectedRewardIds.length} reward${selectedRewardIds.length === 1 ? "" : "s"} selected`
              : "Select one or more rewards to bulk edit"}
          </p>
          <div className="admin-game-reward-bulk-actions">
            <select
              aria-label="Bulk edit selected rewards"
              disabled={isSaving}
              value={rewardBulkAction}
              onChange={(event) => setRewardBulkAction(event.target.value as RewardBulkAction)}
            >
              <option value="levelTier">Level</option>
              <option value="gradeTier">Grade</option>
              <option value="classTier">Class</option>
              <option value="pollSize">Poll-Level</option>
              <option value="levelSize">Level-Level</option>
              <option value="color">Color</option>
            </select>
            {isRewardTierBulkAction(rewardBulkAction) ? (
              <button
                className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                disabled={isSaving || selectedRewardIds.length === 0}
                onClick={() => void copySelectedRewardsToNextTier()}
                type="button"
              >
                Copy to Next...
              </button>
            ) : null}
            {rewardBulkAction === "pollSize" ? (
              <>
                <input
                  aria-label="Bulk poll-level disk size"
                  className="admin-game-reward-bulk-size-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkPollVisualSize(event.target.value)}
                  placeholder="20px"
                  type="text"
                  value={bulkPollVisualSize}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0 || !bulkPollVisualSize.trim()}
                  onClick={() => void applyBulkRewardSizeUpdate("pollReward")}
                  type="button"
                >
                  Apply Poll-Level Size
                </button>
              </>
            ) : null}
            {rewardBulkAction === "levelSize" ? (
              <>
                <input
                  aria-label="Bulk level-level disk size"
                  className="admin-game-reward-bulk-size-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkLevelVisualSize(event.target.value)}
                  placeholder="42px"
                  type="text"
                  value={bulkLevelVisualSize}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0 || !bulkLevelVisualSize.trim()}
                  onClick={() => void applyBulkRewardSizeUpdate("levelReward")}
                  type="button"
                >
                  Apply Level-Level Size
                </button>
              </>
            ) : null}
            {rewardBulkAction === "color" ? (
              <>
                <input
                  aria-label="Bulk disk color"
                  className="admin-game-reward-bulk-color-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkRewardVisualColor(event.target.value)}
                  type="color"
                  value={normalizeBuilderHexColor(bulkRewardVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR)}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onClick={() => void applyBulkRewardColorUpdate()}
                  type="button"
                >
                  Apply Color
                </button>
              </>
            ) : null}
          </div>
        </div>
        {rewardSaveDiagnostic ? (
          <div
            className={`notice admin-game-reward-status admin-game-reward-status-${getRewardSaveDiagnosticTone(rewardSaveDiagnostic, isSaving) ?? "success"}`}
            role="status"
          >
            {rewardSaveDiagnostic}
          </div>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>
                  <label className="admin-game-table-checkbox-label">
                    <input
                      aria-label="Check all rewards"
                      checked={sortedRewards.length > 0 && sortedRewards.every((reward) => selectedRewardIds.includes(reward.id))}
                      disabled={isSaving || sortedRewards.length === 0}
                      onChange={(event) => toggleAllVisibleRewards(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Check All</span>
                  </label>
                </th>
                {REWARD_TABLE_COLUMNS.map((column) => (
                  <th className={column.key === "rewardVisual" ? "admin-game-reward-visual-cell" : undefined} key={column.key}>
                    <AdminTableSortButton
                      activeSortKey={rewardSortKey}
                      label={column.label}
                      onSort={handleRewardSort}
                      sortDirection={rewardSortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRewards.map((reward) => (
                <Fragment key={reward.id}>
                  <tr className={editingRewardId === reward.id ? "admin-game-inline-editor-source-row" : undefined}>
                    <td>
                      <input
                        aria-label={`Select reward ${reward.name}`}
                        checked={selectedRewardIds.includes(reward.id)}
                        disabled={isSaving}
                        onChange={(event) => toggleRewardSelection(reward.id, event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong>{reward.name}</strong>
                      {reward.description ? <div className="admin-table-subcopy">{reward.description}</div> : null}
                    </td>
                    <td>{rewardTypeLabel(reward.rewardType)}</td>
                    <td>{getRewardTierValue(reward, "levelTier")}</td>
                    <td>{getRewardTierValue(reward, "gradeTier")}</td>
                    <td>{getRewardTierValue(reward, "classTier")}</td>
                    <td className="admin-game-reward-visual-cell">
                      <RewardVisualSummary reward={reward} />
                    </td>
                    <td className="crud-actions-cell">
                      <div className="table-actions">
                        <button
                          aria-label="Edit reward"
                          className="polls-icon-button polls-icon-button-edit"
                          disabled={isSaving}
                          onClick={() => {
                            setEditingRewardId(reward.id);
                            setRewardDraft(rewardToDraft(reward, gameLevels));
                          }}
                          title="Edit"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Clone reward"
                          className="polls-icon-button polls-icon-button-view"
                          disabled={isSaving}
                          onClick={() => void cloneReward(reward)}
                          title="Clone"
                          type="button"
                        >
                          ⧉
                        </button>
                        <button
                          aria-label="Delete reward"
                          className="polls-icon-button polls-icon-button-danger"
                          disabled={isSaving}
                          onClick={() => void deleteReward(reward)}
                          title="Delete"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingRewardId === reward.id ? (
                    <tr className="admin-game-inline-editor-row">
                      <td colSpan={REWARD_TABLE_COLUMN_COUNT}>
                        <RewardEditor
                          draft={rewardDraft}
                          galleryMedia={galleryMedia}
                          gameLevels={gameLevels}
                          progressiveFeatures={progressiveFeatures}
                          rewards={rewards}
                          isSaving={isSaving}
                          onCancel={() => setEditingRewardId("")}
                          onChange={setRewardDraft}
                          onSave={() => void saveReward()}
                          onGalleryRefresh={loadGalleryMedia}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {sortedRewards.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={REWARD_TABLE_COLUMN_COUNT}>
                    {isLoading
                      ? "Loading rewards..."
                      : rewards.length === 0
                        ? "No rewards found."
                        : "No rewards match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Point Redemptions</div>
            <h2>Redemptions</h2>
            <p className="admin-section-intro">
              The redemption catalog will sit here under the reward definitions as we wire points-for-reward claiming.
            </p>
          </div>
        </div>
      </section>
      </>
      ) : null}

      {activeSection === "scoring" ? (
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Scoring</div>
            <h2>Point Scoring Rules</h2>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewScoringRule} type="button">
            New Scoring Rule
          </button>
        </div>
        {editingScoringRuleId === "new" ? (
          <ScoringRuleEditor
            draft={scoringRuleDraft}
            isSaving={isSaving}
            onCancel={() => setEditingScoringRuleId("")}
            onChange={setScoringRuleDraft}
            onSave={() => void saveScoringRule()}
          />
        ) : null}
        <div className="admin-products-filter-bar admin-game-filter-bar">
          <label className="field">
            <span>Score name or criteria</span>
            <input
              type="search"
              value={scoringRuleQuery}
              onChange={(event) => setScoringRuleQuery(event.target.value)}
              placeholder="Filter scoring rules"
            />
          </label>
          <label className="field">
            <span>Min points</span>
            <input
              min="0"
              type="number"
              value={scoringRuleMinPoints}
              onChange={(event) => setScoringRuleMinPoints(event.target.value)}
              placeholder="Any"
            />
          </label>
          <label className="field">
            <span>Max points</span>
            <input
              min="0"
              type="number"
              value={scoringRuleMaxPoints}
              onChange={(event) => setScoringRuleMaxPoints(event.target.value)}
              placeholder="Any"
            />
          </label>
        </div>
        {hasScoringRuleFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedScoringRules.length} of {scoringRules.length} scoring rules
          </p>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                {SCORING_TABLE_COLUMNS.map((column) => (
                  <th key={column.key}>
                    <AdminTableSortButton
                      activeSortKey={scoringRuleSortKey}
                      label={column.label}
                      onSort={handleScoringRuleSort}
                      sortDirection={scoringRuleSortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedScoringRules.map((scoringRule) => (
                <tr key={scoringRule.id}>
                  <td><strong>{scoringRule.scoreName}</strong></td>
                  <td>{scoringRule.description || <span className="admin-table-empty">None</span>}</td>
                  <td>{scoringRule.specificCriteria || <span className="admin-table-empty">None</span>}</td>
                  <td>{scoringRule.points}</td>
                  <td>{formatTemplateTimestamp(scoringRule.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label="Edit scoring rule"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingScoringRuleId(scoringRule.id);
                          setScoringRuleDraft(scoringRuleToDraft(scoringRule));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete scoring rule"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteScoringRule(scoringRule)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedScoringRules.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading
                      ? "Loading scoring rules..."
                      : scoringRules.length === 0
                        ? "No scoring rules found."
                        : "No scoring rules match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingScoringRuleId && editingScoringRuleId !== "new" ? (
          <ScoringRuleEditor
            draft={scoringRuleDraft}
            isSaving={isSaving}
            onCancel={() => setEditingScoringRuleId("")}
            onChange={setScoringRuleDraft}
            onSave={() => void saveScoringRule()}
          />
        ) : null}
      </section>
      ) : null}
    </section>
  );
}
