"use client";

import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import type {
  GameLevel,
  GameLevelName,
  GameLevelUpCriterion,
  GameLevelUpRule,
  GameSublevel,
  GameReward,
  GameRewardStatus,
  GameRewardType,
  GameScoringRule
} from "@/lib/game-admin";
import { GAME_LEVEL_NAMES, GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";

type GameSnapshot = {
  gameLevels: GameLevel[];
  levelUpRules: GameLevelUpRule[];
  rewards: GameReward[];
  scoringRules: GameScoringRule[];
};

type GameLevelDraft = Partial<GameLevel>;
type LevelUpRuleDraft = Partial<GameLevelUpRule>;
type RewardDraft = Partial<GameReward> & {
  inventoryCountText?: string;
  pollVisualType?: string;
  pollDigitalProduct?: string;
  pollVisualColor?: string;
  pollVisualSize?: string;
  pollVisualBorderColor?: string;
  pollVisualBorderWidth?: string;
  levelVisualType?: string;
  levelDigitalProduct?: string;
  levelVisualColor?: string;
  levelVisualSize?: string;
  levelVisualBorderColor?: string;
  levelVisualBorderWidth?: string;
  achievementLevelName?: GameLevelName;
  achievementSublevelName?: string;
};
type ScoringRuleDraft = Partial<GameScoringRule>;
type SortDirection = "asc" | "desc";
type GameSection = "levels" | "scoring" | "level-up" | "redemptions";
type GameLevelSortKey = "levelName" | "levelOrder" | "sublevels";
type RewardSortKey = "name" | "rewardType" | "status" | "pointsCost" | "inventoryCount" | "rewardVisual";
type ScoringRuleSortKey = "scoreName" | "description" | "specificCriteria" | "points" | "updatedAt";

const DEFAULT_BADGE_BACKGROUND_COLOR = "#d8212d";

const GAME_LEVEL_TABLE_COLUMNS: Array<{ key: GameLevelSortKey; label: string }> = [
  { key: "levelName", label: "Progression Track" },
  { key: "levelOrder", label: "Order" },
  { key: "sublevels", label: "Sublevels" }
];

const REWARD_TABLE_COLUMNS: Array<{ key: RewardSortKey; label: string }> = [
  { key: "name", label: "Reward" },
  { key: "rewardType", label: "Type" },
  { key: "status", label: "Status" },
  { key: "pointsCost", label: "Cost" },
  { key: "inventoryCount", label: "Inventory" },
  { key: "rewardVisual", label: "Reward Disk" }
];

const SCORING_TABLE_COLUMNS: Array<{ key: ScoringRuleSortKey; label: string }> = [
  { key: "scoreName", label: "Score Name" },
  { key: "description", label: "Description" },
  { key: "specificCriteria", label: "Specific Criteria" },
  { key: "points", label: "Points" },
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

function createGameLevelDraft(): GameLevelDraft {
  return {
    levelName: "Levels",
    levelOrder: 1,
    sublevels: []
  };
}

function createLevelUpRuleDraft(gameLevels: GameLevel[] = [], scoringRules: GameScoringRule[] = []): LevelUpRuleDraft {
  const firstLevel = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder)[0];
  const firstSublevel = firstLevel?.sublevels.slice().sort((left, right) => left.order - right.order)[0];
  const firstScoringRule = scoringRules[0];

  return {
    levelName: firstLevel?.levelName ?? "Grades",
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

function createRewardDraft(): RewardDraft {
  return {
    name: "Grade: First Red Disk",
    description: "",
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
    levelVisualType: "coin",
    levelDigitalProduct: "",
    levelVisualColor: DEFAULT_BADGE_BACKGROUND_COLOR,
    levelVisualSize: "10px",
    levelVisualBorderColor: "",
    levelVisualBorderWidth: "",
    achievementLevelName: "Grades",
    achievementSublevelName: "First"
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

function rewardToDraft(reward: GameReward): RewardDraft {
  const metadata = reward.metadata;
  const pollReward =
    metadata.pollReward && typeof metadata.pollReward === "object" && !Array.isArray(metadata.pollReward)
      ? (metadata.pollReward as Record<string, unknown>)
      : metadata;
  const levelReward =
    metadata.levelReward && typeof metadata.levelReward === "object" && !Array.isArray(metadata.levelReward)
      ? (metadata.levelReward as Record<string, unknown>)
      : metadata;

  return {
    ...reward,
    inventoryCountText: reward.inventoryCount === null ? "" : String(reward.inventoryCount),
    pollVisualType: String(pollReward.visualType ?? "coin"),
    pollDigitalProduct: String(pollReward.digitalProduct ?? ""),
    pollVisualColor: normalizeBuilderHexColor(pollReward.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
    pollVisualSize: String(pollReward.visualSize ?? "10px"),
    pollVisualBorderColor: String(pollReward.visualBorderColor ?? ""),
    pollVisualBorderWidth: String(pollReward.visualBorderWidth ?? ""),
    levelVisualType: String(levelReward.visualType ?? "coin"),
    levelDigitalProduct: String(levelReward.digitalProduct ?? ""),
    levelVisualColor: normalizeBuilderHexColor(levelReward.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
    levelVisualSize: String(levelReward.visualSize ?? "10px"),
    levelVisualBorderColor: String(levelReward.visualBorderColor ?? ""),
    levelVisualBorderWidth: String(levelReward.visualBorderWidth ?? ""),
    achievementLevelName: (metadata.achievementLevelName as GameLevelName | undefined) ?? "Grades",
    achievementSublevelName: String(metadata.achievementSublevelName ?? "First")
  };
}

function rewardDraftToMetadata(draft: RewardDraft) {
  return {
    ...(draft.metadata ?? {}),
    pollReward: {
      visualType: draft.pollVisualType ?? "coin",
      digitalProduct: draft.pollDigitalProduct ?? "",
      visualColor: normalizeBuilderHexColor(draft.pollVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
      visualSize: draft.pollVisualSize ?? "10px",
      visualBorderColor: draft.pollVisualBorderColor ?? "",
      visualBorderWidth: draft.pollVisualBorderWidth ?? ""
    },
    levelReward: {
      visualType: draft.levelVisualType ?? "coin",
      digitalProduct: draft.levelDigitalProduct ?? "",
      visualColor: normalizeBuilderHexColor(draft.levelVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
      visualSize: draft.levelVisualSize ?? "10px",
      visualBorderColor: draft.levelVisualBorderColor ?? "",
      visualBorderWidth: draft.levelVisualBorderWidth ?? ""
    },
    achievementLevelName: draft.achievementLevelName ?? "Grades",
    achievementSublevelName: draft.achievementSublevelName ?? ""
  };
}

function rewardToPayload(reward: RewardDraft | GameReward, overrides: Partial<RewardDraft | GameReward> = {}) {
  const source = { ...reward, ...overrides } as RewardDraft;

  return {
    name: source.name,
    description: source.description,
    rewardType: source.rewardType,
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
    metadata: "inventoryCountText" in source ? rewardDraftToMetadata(source) : source.metadata
  };
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

function getSublevelsForLevel(gameLevels: GameLevel[], levelName: GameLevelName | undefined) {
  return gameLevels.find((gameLevel) => gameLevel.levelName === levelName)?.sublevels ?? [];
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

function formatRewardAchievement(reward: GameReward) {
  const levelName = String(reward.metadata.achievementLevelName ?? "").trim();
  const sublevelName = String(reward.metadata.achievementSublevelName ?? "").trim();

  return [levelName, sublevelName].filter(Boolean).join(": ") || "Unassigned achievement";
}

function getRewardVisualRecord(reward: GameReward, key: "pollReward" | "levelReward") {
  const metadata = reward.metadata;
  const visual = metadata[key] && typeof metadata[key] === "object" && !Array.isArray(metadata[key])
    ? (metadata[key] as Record<string, unknown>)
    : metadata;

  return {
    color: normalizeBuilderHexColor(visual.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR),
    size: String(visual.visualSize ?? "10px").trim() || "10px",
    type: String(visual.visualType ?? "coin").trim() || "coin"
  };
}

function formatRewardVisualSortValue(reward: GameReward) {
  const pollReward = getRewardVisualRecord(reward, "pollReward");
  const levelReward = getRewardVisualRecord(reward, "levelReward");
  return `${pollReward.type} ${pollReward.color} ${pollReward.size} ${levelReward.type} ${levelReward.color} ${levelReward.size}`;
}

function RewardVisualSummary({ reward }: { reward: GameReward }) {
  const pollReward = getRewardVisualRecord(reward, "pollReward");
  const levelReward = getRewardVisualRecord(reward, "levelReward");

  return (
    <div className="admin-game-reward-visual-summary">
      {[
        ["Poll-Level", pollReward],
        ["Level-Level", levelReward]
      ].map(([label, visual]) => {
        const rewardVisual = visual as ReturnType<typeof getRewardVisualRecord>;
        const style = {
          backgroundColor: rewardVisual.color,
          borderColor: rewardVisual.color,
          width: rewardVisual.size,
          height: rewardVisual.size
        } as CSSProperties;

        return (
          <div className="admin-game-reward-visual-item" key={label as string}>
            <span className="admin-game-reward-visual-disk" style={style} />
            <span>
              <strong>{label as string}</strong>
              <span>{rewardVisual.color} / {rewardVisual.size}</span>
            </span>
          </div>
        );
      })}
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
    case "pointsCost":
      result = left.pointsCost - right.pointsCost;
      break;
    case "inventoryCount":
      result = (left.inventoryCount ?? Number.POSITIVE_INFINITY) - (right.inventoryCount ?? Number.POSITIVE_INFINITY);
      break;
    case "rewardType":
      result = compareText(rewardTypeLabel(left.rewardType), rewardTypeLabel(right.rewardType));
      break;
    case "status":
      result = compareText(statusLabel(left.status), statusLabel(right.status));
      break;
    case "rewardVisual":
      result = compareText(formatRewardVisualSortValue(left), formatRewardVisualSortValue(right));
      break;
    case "name":
      result = compareText(left.name, right.name);
      break;
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
            value={draft.levelName ?? "Levels"}
            onChange={(event) => onChange({ ...draft, levelName: event.target.value as GameLevelName })}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{levelName}</option>
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
            value={draft.levelName ?? "Grades"}
            onChange={(event) => {
              const levelName = event.target.value as GameLevelName;
              const firstSublevel = getSublevelsForLevel(gameLevels, levelName).slice().sort((left, right) => left.order - right.order)[0];
              onChange({ ...draft, levelName, sublevelName: firstSublevel?.name ?? "" });
            }}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{levelName}</option>
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

const BADGE_STYLE_OPTIONS = ["coin", "jewel", "ribbon", "medal", "trophy"];
const REWARD_BORDER_WIDTH_OPTIONS = Array.from({ length: 10 }, (_, index) => `${index + 1}px`);

type RewardStyleValues = {
  visualType?: string;
  digitalProduct?: string;
  visualColor?: string;
  visualSize?: string;
  visualBorderColor?: string;
  visualBorderWidth?: string;
};

function RewardStyleColumn({
  title,
  rewardType,
  values,
  onChange
}: {
  title: string;
  rewardType: GameRewardType;
  values: RewardStyleValues;
  onChange: (next: RewardStyleValues) => void;
}) {
  return (
    <div className="admin-game-reward-style-column">
      <h3>{title}</h3>
      {rewardType === "badge" ? (
        <label className="field">
          <span>Badge</span>
          <select
            value={values.visualType ?? "coin"}
            onChange={(event) => onChange({ ...values, visualType: event.target.value })}
          >
            {BADGE_STYLE_OPTIONS.map((badge) => (
              <option key={badge} value={badge}>{badge}</option>
            ))}
          </select>
        </label>
      ) : null}
      {rewardType === "digital" ? (
        <label className="field">
          <span>Digital product</span>
          <select
            value={values.digitalProduct ?? ""}
            onChange={(event) => onChange({ ...values, digitalProduct: event.target.value })}
          >
            <option value="">TBD</option>
          </select>
        </label>
      ) : null}
      <label className="field">
        <span>Background Color</span>
        <input
          aria-label={`${title} background color`}
          type="color"
          value={normalizeBuilderHexColor(values.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR)}
          onChange={(event) => onChange({ ...values, visualColor: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Size</span>
        <input
          type="text"
          value={values.visualSize ?? "10px"}
          onChange={(event) => onChange({ ...values, visualSize: event.target.value })}
          placeholder="10px"
        />
      </label>
      <label className="field">
        <span>Border Color</span>
        <input
          type="text"
          value={values.visualBorderColor ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderColor: event.target.value })}
          placeholder="#991b1b"
        />
      </label>
      <label className="field">
        <span>Border Width</span>
        <select
          value={values.visualBorderWidth ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderWidth: event.target.value })}
        >
          <option value="">None</option>
          {REWARD_BORDER_WIDTH_OPTIONS.map((width) => (
            <option key={width} value={width}>{width}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function RewardEditor({
  draft,
  gameLevels,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: RewardDraft;
  gameLevels: GameLevel[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: RewardDraft) => void;
  onSave: () => void;
}) {
  const sublevels = getSublevelsForLevel(gameLevels, draft.achievementLevelName);
  const selectedRewardType = draft.rewardType ?? "";

  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="admin-game-reward-grid">
        <div className="admin-game-reward-definition-column">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={draft.name ?? ""}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder="Grade: First Red Disk"
            />
          </label>
          <label className="field">
            <span>Achievement Track</span>
            <select
              value={draft.achievementLevelName ?? "Grades"}
              onChange={(event) =>
                onChange({
                  ...draft,
                  achievementLevelName: event.target.value as GameLevelName,
                  achievementSublevelName: ""
                })
              }
            >
              {GAME_LEVEL_NAMES.map((levelName) => (
                <option key={levelName} value={levelName}>{levelName}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Achievement Sublevel</span>
            <select
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
          </label>
          <label className="field">
            <span>Points</span>
            <input
              min="0"
              type="number"
              value={draft.pointsCost ?? 0}
              onChange={(event) => onChange({ ...draft, pointsCost: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Inventory</span>
            <input
              min="0"
              type="number"
              value={draft.inventoryCountText ?? ""}
              onChange={(event) => onChange({ ...draft, inventoryCountText: event.target.value })}
              placeholder="Unlimited"
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={draft.status ?? "draft"}
              onChange={(event) => onChange({ ...draft, status: event.target.value as GameRewardStatus })}
            >
              {GAME_REWARD_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select
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
          </label>
        </div>
        {selectedRewardType ? (
          <>
            <RewardStyleColumn
              title="Poll-Level Reward"
              rewardType={selectedRewardType}
              values={{
                visualType: draft.pollVisualType,
                digitalProduct: draft.pollDigitalProduct,
                visualColor: draft.pollVisualColor,
                visualSize: draft.pollVisualSize,
                visualBorderColor: draft.pollVisualBorderColor,
                visualBorderWidth: draft.pollVisualBorderWidth
              }}
              onChange={(next) =>
                onChange({
                  ...draft,
                  pollVisualType: next.visualType,
                  pollDigitalProduct: next.digitalProduct,
                  pollVisualColor: next.visualColor,
                  pollVisualSize: next.visualSize,
                  pollVisualBorderColor: next.visualBorderColor,
                  pollVisualBorderWidth: next.visualBorderWidth
                })
              }
            />
            <RewardStyleColumn
              title="Level-Level Reward"
              rewardType={selectedRewardType}
              values={{
                visualType: draft.levelVisualType,
                digitalProduct: draft.levelDigitalProduct,
                visualColor: draft.levelVisualColor,
                visualSize: draft.levelVisualSize,
                visualBorderColor: draft.levelVisualBorderColor,
                visualBorderWidth: draft.levelVisualBorderWidth
              }}
              onChange={(next) =>
                onChange({
                  ...draft,
                  levelVisualType: next.visualType,
                  levelDigitalProduct: next.digitalProduct,
                  levelVisualColor: next.visualColor,
                  levelVisualSize: next.visualSize,
                  levelVisualBorderColor: next.visualBorderColor,
                  levelVisualBorderWidth: next.visualBorderWidth
                })
              }
            />
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
  const [levelUpRules, setLevelUpRules] = useState<GameLevelUpRule[]>([]);
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [scoringRules, setScoringRules] = useState<GameScoringRule[]>([]);
  const [activeSection, setActiveSection] = useState<GameSection>("levels");
  const [editingGameLevelId, setEditingGameLevelId] = useState("");
  const [editingLevelUpRuleId, setEditingLevelUpRuleId] = useState("");
  const [editingRewardId, setEditingRewardId] = useState("");
  const [editingScoringRuleId, setEditingScoringRuleId] = useState("");
  const [gameLevelDraft, setGameLevelDraft] = useState<GameLevelDraft>(createGameLevelDraft());
  const [levelUpRuleDraft, setLevelUpRuleDraft] = useState<LevelUpRuleDraft>(createLevelUpRuleDraft());
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(createRewardDraft());
  const [scoringRuleDraft, setScoringRuleDraft] = useState<ScoringRuleDraft>(createScoringRuleDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardSaveDiagnostic, setRewardSaveDiagnostic] = useState<string | null>(null);
  const [gameLevelSortKey, setGameLevelSortKey] = useState<GameLevelSortKey>("levelOrder");
  const [gameLevelSortDirection, setGameLevelSortDirection] = useState<SortDirection>("asc");
  const [rewardSortKey, setRewardSortKey] = useState<RewardSortKey>("name");
  const [rewardSortDirection, setRewardSortDirection] = useState<SortDirection>("desc");
  const [scoringRuleSortKey, setScoringRuleSortKey] = useState<ScoringRuleSortKey>("updatedAt");
  const [scoringRuleSortDirection, setScoringRuleSortDirection] = useState<SortDirection>("desc");
  const [gameLevelNameFilter, setGameLevelNameFilter] = useState<"" | GameLevelName>("");
  const [gameLevelOrderFilter, setGameLevelOrderFilter] = useState("");
  const [gameLevelQuery, setGameLevelQuery] = useState("");
  const [draggedGameLevelId, setDraggedGameLevelId] = useState<string | null>(null);
  const [rewardQuery, setRewardQuery] = useState("");
  const [rewardTypeFilter, setRewardTypeFilter] = useState<"" | GameRewardType>("");
  const [rewardStatusFilter, setRewardStatusFilter] = useState<"" | GameRewardStatus>("");
  const [scoringRuleQuery, setScoringRuleQuery] = useState("");
  const [scoringRuleMinPoints, setScoringRuleMinPoints] = useState("");
  const [scoringRuleMaxPoints, setScoringRuleMaxPoints] = useState("");

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

    return rewards.filter((reward) => {
      if (rewardTypeFilter && reward.rewardType !== rewardTypeFilter) {
        return false;
      }

      if (rewardStatusFilter && reward.status !== rewardStatusFilter) {
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
  }, [rewardQuery, rewardStatusFilter, rewardTypeFilter, rewards]);

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

  const sortedScoringRules = useMemo(
    () =>
      [...filteredScoringRules].sort((left, right) =>
        compareScoringRules(left, right, scoringRuleSortKey, scoringRuleSortDirection)
      ),
    [filteredScoringRules, scoringRuleSortDirection, scoringRuleSortKey]
  );

  const hasGameLevelFilters = Boolean(gameLevelNameFilter || gameLevelOrderFilter.trim() || gameLevelQuery.trim());
  const hasRewardFilters = Boolean(rewardQuery.trim() || rewardTypeFilter || rewardStatusFilter);
  const hasScoringRuleFilters = Boolean(
    scoringRuleQuery.trim() || scoringRuleMinPoints.trim() || scoringRuleMaxPoints.trim()
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

  async function loadGame() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/game", { cache: "no-store" });
      const data = await readAdminJson<GameSnapshot & { error?: string }>(response, "Failed to load game settings.");
      setGameLevels(data.gameLevels ?? []);
      setLevelUpRules(data.levelUpRules ?? []);
      setRewards(data.rewards ?? []);
      setScoringRules(data.scoringRules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load game settings.");
      setGameLevels([]);
      setLevelUpRules([]);
      setRewards([]);
      setScoringRules([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGame();
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
      setMessage(`Saved ${data.gameLevel.levelName}.`);
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
      setMessage(`Saved level up rule for ${data.levelUpRule.levelName}: ${data.levelUpRule.sublevelName}.`);
      setEditingLevelUpRuleId("");
      setLevelUpRuleDraft(createLevelUpRuleDraft(gameLevels, scoringRules));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save level up rule.");
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
    if (!window.confirm(`Delete ${gameLevel.levelName} order ${gameLevel.levelOrder}?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/levels/${gameLevel.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete progression track.");
      setGameLevels((current) => current.filter((item) => item.id !== gameLevel.id));
      setMessage(`Deleted ${gameLevel.levelName}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete progression track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLevelUpRule(rule: GameLevelUpRule) {
    if (!window.confirm(`Delete level up rule for ${rule.levelName}: ${rule.sublevelName}?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/level-up/${rule.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete level up rule.");
      setLevelUpRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage(`Deleted level up rule for ${rule.levelName}: ${rule.sublevelName}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete level up rule.");
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
                <option key={levelName} value={levelName}>{levelName}</option>
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
                      <strong>{gameLevel.levelName}</strong>
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
                  <td><strong>{rule.levelName}</strong></td>
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
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingRewardId("")}
            onChange={setRewardDraft}
            onSave={() => void saveReward()}
          />
        ) : null}
        {rewardSaveDiagnostic ? (
          <div className="notice success player-inline-notice admin-game-save-diagnostic">
            {rewardSaveDiagnostic}
          </div>
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
        </div>
        {hasRewardFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedRewards.length} of {rewards.length} rewards
          </p>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
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
                <tr key={reward.id}>
                  <td>
                    <strong>{reward.name}</strong>
                    {reward.description ? <div className="admin-table-subcopy">{reward.description}</div> : null}
                    <div className="admin-table-subcopy">{formatRewardAchievement(reward)}</div>
                  </td>
                  <td>{rewardTypeLabel(reward.rewardType)}</td>
                  <td>{statusLabel(reward.status)}</td>
                  <td>{reward.pointsCost}</td>
                  <td>{reward.inventoryCount === null ? "Unlimited" : reward.inventoryCount}</td>
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
                          setRewardDraft(rewardToDraft(reward));
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
              ))}
              {sortedRewards.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
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
        {editingRewardId && editingRewardId !== "new" ? (
          <RewardEditor
            draft={rewardDraft}
            gameLevels={gameLevels}
            isSaving={isSaving}
            onCancel={() => setEditingRewardId("")}
            onChange={setRewardDraft}
            onSave={() => void saveReward()}
          />
        ) : null}
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
