"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GameLevel,
  GameLevelName,
  GameReward,
  GameRewardStatus,
  GameRewardType,
  GameScoringRule
} from "@/lib/game-admin";
import { GAME_LEVEL_NAMES, GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";

type GameSnapshot = {
  gameLevels: GameLevel[];
  rewards: GameReward[];
  scoringRules: GameScoringRule[];
};

type GameLevelDraft = Partial<GameLevel> & { gameLevelLevelsText?: string };
type RewardDraft = Partial<GameReward> & { inventoryCountText?: string };
type ScoringRuleDraft = Partial<GameScoringRule>;
type SortDirection = "asc" | "desc";
type GameLevelSortKey = "levelName" | "levelOrder" | "gameLevelLevels" | "updatedAt";
type RewardSortKey = "name" | "rewardType" | "status" | "pointsCost" | "inventoryCount" | "updatedAt";
type ScoringRuleSortKey = "scoreName" | "description" | "specificCriteria" | "points" | "updatedAt";

const GAME_LEVEL_TABLE_COLUMNS: Array<{ key: GameLevelSortKey; label: string }> = [
  { key: "levelName", label: "Level Name" },
  { key: "levelOrder", label: "Order" },
  { key: "gameLevelLevels", label: "Game Level Levels" },
  { key: "updatedAt", label: "Updated" }
];

const REWARD_TABLE_COLUMNS: Array<{ key: RewardSortKey; label: string }> = [
  { key: "name", label: "Reward" },
  { key: "rewardType", label: "Type" },
  { key: "status", label: "Status" },
  { key: "pointsCost", label: "Cost" },
  { key: "inventoryCount", label: "Inventory" },
  { key: "updatedAt", label: "Updated" }
];

const SCORING_TABLE_COLUMNS: Array<{ key: ScoringRuleSortKey; label: string }> = [
  { key: "scoreName", label: "Score Name" },
  { key: "description", label: "Description" },
  { key: "specificCriteria", label: "Specific Criteria" },
  { key: "points", label: "Points" },
  { key: "updatedAt", label: "Updated" }
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

function createGameLevelDraft(): GameLevelDraft {
  return {
    levelName: "Rank",
    levelOrder: 1,
    gameLevelLevels: [],
    gameLevelLevelsText: ""
  };
}

function createRewardDraft(): RewardDraft {
  return {
    name: "",
    description: "",
    rewardType: "custom",
    pointsCost: 0,
    inventoryCountText: "",
    status: "draft",
    imageUrl: "",
    redemptionUrl: ""
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
  return {
    ...gameLevel,
    gameLevelLevelsText: gameLevel.gameLevelLevels.join("\n")
  };
}

function rewardToDraft(reward: GameReward): RewardDraft {
  return {
    ...reward,
    inventoryCountText: reward.inventoryCount === null ? "" : String(reward.inventoryCount)
  };
}

function scoringRuleToDraft(scoringRule: GameScoringRule): ScoringRuleDraft {
  return { ...scoringRule };
}

function rewardTypeLabel(type: GameRewardType) {
  return {
    access: "Access",
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
    case "gameLevelLevels":
      result = compareText(left.gameLevelLevels.join(" "), right.gameLevelLevels.join(" "));
      break;
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
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
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
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
  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field">
          <span>Level name</span>
          <select
            value={draft.levelName ?? "Rank"}
            onChange={(event) => onChange({ ...draft, levelName: event.target.value as GameLevelName })}
          >
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{levelName}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Level order</span>
          <select
            value={String(draft.levelOrder ?? 1)}
            onChange={(event) => onChange({ ...draft, levelOrder: Number(event.target.value) })}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((levelOrder) => (
              <option key={levelOrder} value={levelOrder}>{levelOrder}</option>
            ))}
          </select>
        </label>
        <label className="field admin-game-wide-field">
          <span>Game level levels</span>
          <textarea
            value={draft.gameLevelLevelsText ?? ""}
            onChange={(event) => onChange({ ...draft, gameLevelLevelsText: event.target.value })}
            placeholder="One level label per line"
            rows={6}
          />
        </label>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Game Level"}
        </button>
      </div>
    </div>
  );
}

function RewardEditor({
  draft,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: RewardDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: RewardDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="builder-product-editor-grid admin-game-editor-grid">
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={draft.name ?? ""}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Normie sticker pack"
          />
        </label>
        <label className="field">
          <span>Type</span>
          <select
            value={draft.rewardType ?? "custom"}
            onChange={(event) => onChange({ ...draft, rewardType: event.target.value as GameRewardType })}
          >
            {GAME_REWARD_TYPES.map((type) => (
              <option key={type} value={type}>{rewardTypeLabel(type)}</option>
            ))}
          </select>
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
          <span>Points cost</span>
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
          <span>Image URL</span>
          <input
            type="text"
            value={draft.imageUrl ?? ""}
            onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Redemption URL</span>
          <input
            type="text"
            value={draft.redemptionUrl ?? ""}
            onChange={(event) => onChange({ ...draft, redemptionUrl: event.target.value })}
          />
        </label>
        <label className="field admin-game-wide-field">
          <span>Description</span>
          <textarea
            value={draft.description ?? ""}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            rows={4}
          />
        </label>
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
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [scoringRules, setScoringRules] = useState<GameScoringRule[]>([]);
  const [editingGameLevelId, setEditingGameLevelId] = useState("");
  const [editingRewardId, setEditingRewardId] = useState("");
  const [editingScoringRuleId, setEditingScoringRuleId] = useState("");
  const [gameLevelDraft, setGameLevelDraft] = useState<GameLevelDraft>(createGameLevelDraft());
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(createRewardDraft());
  const [scoringRuleDraft, setScoringRuleDraft] = useState<ScoringRuleDraft>(createScoringRuleDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [gameLevelSortKey, setGameLevelSortKey] = useState<GameLevelSortKey>("levelOrder");
  const [gameLevelSortDirection, setGameLevelSortDirection] = useState<SortDirection>("asc");
  const [rewardSortKey, setRewardSortKey] = useState<RewardSortKey>("updatedAt");
  const [rewardSortDirection, setRewardSortDirection] = useState<SortDirection>("desc");
  const [scoringRuleSortKey, setScoringRuleSortKey] = useState<ScoringRuleSortKey>("updatedAt");
  const [scoringRuleSortDirection, setScoringRuleSortDirection] = useState<SortDirection>("desc");
  const [gameLevelNameFilter, setGameLevelNameFilter] = useState<"" | GameLevelName>("");
  const [gameLevelOrderFilter, setGameLevelOrderFilter] = useState("");
  const [gameLevelQuery, setGameLevelQuery] = useState("");
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
        const haystack = [gameLevel.levelName, gameLevel.gameLevelLevels.join(" ")]
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
    setGameLevelSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  function handleRewardSort(nextKey: RewardSortKey) {
    if (rewardSortKey === nextKey) {
      setRewardSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setRewardSortKey(nextKey);
    setRewardSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
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
      setRewards(data.rewards ?? []);
      setScoringRules(data.scoringRules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load game settings.");
      setGameLevels([]);
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
    setEditingGameLevelId("new");
    setGameLevelDraft(createGameLevelDraft());
  }

  function startNewReward() {
    resetMessages();
    setEditingRewardId("new");
    setRewardDraft(createRewardDraft());
  }

  function startNewScoringRule() {
    resetMessages();
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
            gameLevelLevels: gameLevelDraft.gameLevelLevelsText
          })
        }
      );
      const data = await readAdminJson<{ gameLevel?: GameLevel; error?: string }>(
        response,
        "Failed to save game level."
      );

      if (!data.gameLevel) {
        throw new Error(data.error ?? "Failed to save game level.");
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
      setError(saveError instanceof Error ? saveError.message : "Failed to save game level.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReward() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(rewardDraft.id ? `/api/admin/game/rewards/${rewardDraft.id}` : "/api/admin/game/rewards", {
        method: rewardDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rewardDraft.name,
          description: rewardDraft.description,
          rewardType: rewardDraft.rewardType,
          pointsCost: rewardDraft.pointsCost,
          inventoryCount: rewardDraft.inventoryCountText,
          status: rewardDraft.status,
          imageUrl: rewardDraft.imageUrl,
          redemptionUrl: rewardDraft.redemptionUrl
        })
      });
      const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to save reward.");

      if (!data.reward) {
        throw new Error(data.error ?? "Failed to save reward.");
      }

      setRewards((current) =>
        rewardDraft.id ? current.map((item) => (item.id === data.reward!.id ? data.reward! : item)) : [data.reward!, ...current]
      );
      setMessage(`Saved reward "${data.reward.name}".`);
      setEditingRewardId("");
      setRewardDraft(createRewardDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save reward.");
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
      await readAdminJson<{ error?: string }>(response, "Failed to delete game level.");
      setGameLevels((current) => current.filter((item) => item.id !== gameLevel.id));
      setMessage(`Deleted ${gameLevel.levelName}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete game level.");
    } finally {
      setIsSaving(false);
    }
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
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Progression</div>
            <h2>Game Levels</h2>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewGameLevel} type="button">
            New Game Level
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
            <span>Level name</span>
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
            <span>Level order</span>
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
            <span>Level labels</span>
            <input
              type="search"
              value={gameLevelQuery}
              onChange={(event) => setGameLevelQuery(event.target.value)}
              placeholder="Filter level labels"
            />
          </label>
        </div>
        {hasGameLevelFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedGameLevels.length} of {gameLevels.length} game levels
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
              {sortedGameLevels.map((gameLevel) => (
                <tr key={gameLevel.id}>
                  <td><strong>{gameLevel.levelName}</strong></td>
                  <td>{gameLevel.levelOrder}</td>
                  <td>
                    {gameLevel.gameLevelLevels.length
                      ? gameLevel.gameLevelLevels.join(", ")
                      : <span className="admin-table-empty">None</span>}
                  </td>
                  <td>{formatTemplateTimestamp(gameLevel.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        aria-label="Edit game level"
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
                        aria-label="Delete game level"
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
              ))}
              {sortedGameLevels.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    {isLoading
                      ? "Loading game levels..."
                      : gameLevels.length === 0
                        ? "No game levels found."
                        : "No game levels match the current filters."}
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
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Rewards</div>
            <h2>Point Redemptions</h2>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewReward} type="button">
            New Reward
          </button>
        </div>
        {editingRewardId === "new" ? (
          <RewardEditor
            draft={rewardDraft}
            isSaving={isSaving}
            onCancel={() => setEditingRewardId("")}
            onChange={setRewardDraft}
            onSave={() => void saveReward()}
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
                  <th key={column.key}>
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
                  </td>
                  <td>{rewardTypeLabel(reward.rewardType)}</td>
                  <td>{statusLabel(reward.status)}</td>
                  <td>{reward.pointsCost}</td>
                  <td>{reward.inventoryCount === null ? "Unlimited" : reward.inventoryCount}</td>
                  <td>{formatTemplateTimestamp(reward.updatedAt)}</td>
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
    </section>
  );
}
