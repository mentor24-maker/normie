"use client";

import { DEFAULT_BADGE_BACKGROUND_COLOR, GAME_LEVEL_TABLE_COLUMNS, GAME_SECTION_TILES, GameLevelDraft, GameLevelSortKey, GameSection, GameSnapshot, InterstitialDraft, LEVEL_EVENT_TABLE_COLUMNS, LevelEventDraft, LevelEventModuleCategory, LevelEventSortKey, LevelUpRuleDraft, ProgressiveFeatureDraft, REWARD_TABLE_COLUMNS, REWARD_TABLE_COLUMN_COUNT, RewardBulkAction, RewardDraft, RewardSortKey, SCORING_TABLE_COLUMNS, ScoringRuleDraft, ScoringRuleSortKey, SortDirection, applyProgressionToLevelEventDraft, buildBulkRewardColorMetadata, buildBulkRewardSingleSizeMetadata, compareGameLevels, compareLevelEvents, compareRewards, compareScoringRules, createGameLevelDraft, createInterstitialDraft, createLevelEventDraft, createLevelUpRuleDraft, createProgressiveFeatureDraft, createRewardDraft, createScoringRuleDraft, formatGameLevelName, formatInterstitialStatus, formatInterstitialType, formatLevelEventMilestoneCompact, formatLevelUpCriteria, formatSublevels, gameLevelToDraft, getEventModuleCategory, getLevelEventProgression, getRewardSaveDiagnosticTone, getRewardTierValue, interstitialToDraft, isRewardTierBulkAction, levelEventProgressPolls, levelEventToDraft, levelUpRuleToDraft, progressiveFeatureToDraft, readAdminJson, reorderItems, rewardToDraft, rewardToPayload, rewardTypeLabel, scoringRuleToDraft, statusLabel } from "@/components/admin-game/helpers";
import { GameLevelEditor, LevelUpRuleEditor, ProgressiveFeatureEditor } from "@/components/admin-game/level-editors";
import { AdminTableSortButton } from "@/components/admin-game/table-sort-button";
import { LevelEventEditor } from "@/components/admin-game/level-event-editor";
import { RewardEditor, RewardVisualSummary } from "@/components/admin-game/reward-editor";
import { ScoringRuleEditor } from "@/components/admin-game/scoring-rule-editor";
import { InterstitialEditor } from "@/components/admin-game/interstitial-editor";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type DragEvent } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";

import type { GameLevel, GameLevelName, GameLevelUpRule, GameLevelEvent, GameEventModule, GameInterstitial, GameProgressiveFeature, GameReward, GameRewardStatus, GameRewardType, GameScoringRule } from "@/lib/game-admin";
import { GAME_LEVEL_NAMES, GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";

import { eventTargetProgressPolls } from "@/lib/player-progression-tiers";

import { formatTemplateTimestamp } from "@/components/builder/builder-utils";

export function AdminGameWorkspace() {
  const [gameLevels, setGameLevels] = useState<GameLevel[]>([]);
  const [eventModules, setEventModules] = useState<GameEventModule[]>([]);
  const [levelUpRules, setLevelUpRules] = useState<GameLevelUpRule[]>([]);
  const [levelEvents, setLevelEvents] = useState<GameLevelEvent[]>([]);
  const [progressiveFeatures, setProgressiveFeatures] = useState<GameProgressiveFeature[]>([]);
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [scoringRules, setScoringRules] = useState<GameScoringRule[]>([]);
  const [interstitials, setInterstitials] = useState<GameInterstitial[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [activeSection, setActiveSection] = useState<GameSection>("levels");
  const [editingGameLevelId, setEditingGameLevelId] = useState("");
  const [editingLevelUpRuleId, setEditingLevelUpRuleId] = useState("");
  const [editingLevelEventId, setEditingLevelEventId] = useState("");
  const [editingProgressiveFeatureId, setEditingProgressiveFeatureId] = useState("");
  const [editingRewardId, setEditingRewardId] = useState("");
  const [editingScoringRuleId, setEditingScoringRuleId] = useState("");
  const [editingInterstitialId, setEditingInterstitialId] = useState("");
  const [gameLevelDraft, setGameLevelDraft] = useState<GameLevelDraft>(createGameLevelDraft());
  const [levelUpRuleDraft, setLevelUpRuleDraft] = useState<LevelUpRuleDraft>(createLevelUpRuleDraft());
  const [levelEventDraft, setLevelEventDraft] = useState<LevelEventDraft>(createLevelEventDraft());
  const [progressiveFeatureDraft, setProgressiveFeatureDraft] = useState<ProgressiveFeatureDraft>(createProgressiveFeatureDraft());
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(createRewardDraft());
  const [scoringRuleDraft, setScoringRuleDraft] = useState<ScoringRuleDraft>(createScoringRuleDraft());
  const [interstitialDraft, setInterstitialDraft] = useState<InterstitialDraft>(createInterstitialDraft());
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
  const [levelEventModuleCategoryFilter, setLevelEventModuleCategoryFilter] = useState<LevelEventModuleCategory>("");
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

  const sortedInterstitials = useMemo(
    () =>
      [...interstitials].sort(
        (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)
      ),
    [interstitials]
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

  const eventModulesById = useMemo(
    () => new Map(eventModules.map((module) => [module.id, module])),
    [eventModules]
  );

  const levelEventModuleCategoryOptions = useMemo(() => {
    const optionsByValue = new Map<LevelEventModuleCategory, string>();

    for (const eventModule of eventModules) {
      const option = getEventModuleCategory(eventModule);
      optionsByValue.set(option.value, option.label);
    }

    return Array.from(optionsByValue, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [eventModules]);

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

      if (levelEventModuleCategoryFilter) {
        const eventModule = eventModulesById.get(event.moduleId);

        if (getEventModuleCategory(eventModule).value !== levelEventModuleCategoryFilter) {
          return false;
        }
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
    eventModulesById,
    levelEventModuleCategoryFilter,
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

  // Drop selections for rewards that no longer exist (adjust-during-render).
  if (selectedRewardIds.some((id) => !rewards.some((reward) => reward.id === id))) {
    setSelectedRewardIds(selectedRewardIds.filter((id) => rewards.some((reward) => reward.id === id)));
  }

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
    levelEventModuleCategoryFilter
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
      setInterstitials(data.interstitials ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load game settings.");
      setGameLevels([]);
      setEventModules([]);
      setLevelUpRules([]);
      setLevelEvents([]);
      setProgressiveFeatures([]);
      setRewards([]);
      setScoringRules([]);
      setInterstitials([]);
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

  function startNewInterstitial() {
    resetMessages();
    setActiveSection("interstitials");
    setEditingInterstitialId("new");
    setInterstitialDraft(createInterstitialDraft());
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

  async function saveInterstitial() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        interstitialDraft.id ? `/api/admin/game/interstitials/${interstitialDraft.id}` : "/api/admin/game/interstitials",
        {
          method: interstitialDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: interstitialDraft.name,
            description: interstitialDraft.description,
            interstitialType: interstitialDraft.interstitialType,
            displayOrder: interstitialDraft.displayOrder,
            status: interstitialDraft.status,
            metadata: interstitialDraft.metadata ?? {}
          })
        }
      );
      const data = await readAdminJson<{ interstitial?: GameInterstitial; error?: string }>(
        response,
        "Failed to save interstitial."
      );

      if (!data.interstitial) {
        throw new Error(data.error ?? "Failed to save interstitial.");
      }

      setInterstitials((current) =>
        interstitialDraft.id
          ? current.map((item) => (item.id === data.interstitial!.id ? data.interstitial! : item))
          : [...current, data.interstitial!].sort(
              (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)
            )
      );
      setMessage(`Saved interstitial "${data.interstitial.name}".`);
      setEditingInterstitialId("");
      setInterstitialDraft(createInterstitialDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save interstitial.");
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

  async function deleteInterstitial(interstitial: GameInterstitial) {
    if (!window.confirm(`Delete interstitial "${interstitial.name}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/interstitials/${interstitial.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete interstitial.");
      setInterstitials((current) => current.filter((item) => item.id !== interstitial.id));
      if (editingInterstitialId === interstitial.id) {
        setEditingInterstitialId("");
        setInterstitialDraft(createInterstitialDraft());
      }
      setMessage(`Deleted interstitial "${interstitial.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete interstitial.");
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
            <Link className="secondary-button" href="/portal/leaderboard">
              Leaderboard
            </Link>
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
            <span>Module category</span>
            <select
              value={levelEventModuleCategoryFilter}
              onChange={(event) => setLevelEventModuleCategoryFilter(event.target.value)}
            >
              <option value="">All categories</option>
              {levelEventModuleCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
                <Fragment key={event.id}>
                  <tr className={editingLevelEventId === event.id ? "admin-game-inline-editor-source-row" : undefined}>
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
                  {editingLevelEventId === event.id ? (
                    <tr className="admin-game-inline-editor-row">
                      <td colSpan={LEVEL_EVENT_TABLE_COLUMNS.length + 1}>
                        <LevelEventEditor
                          draft={levelEventDraft}
                          eventModules={eventModules}
                          isSaving={isSaving}
                          onCancel={() => setEditingLevelEventId("")}
                          onChange={setLevelEventDraft}
                          onSave={() => void saveLevelEvent()}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
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

      {activeSection === "interstitials" ? (
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Interstitials</div>
            <h2>Poll Panel Interstitials</h2>
            <p className="page-copy admin-copy">
              Configure messages that appear in the main polling panel between questions.
            </p>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewInterstitial} type="button">
            New Interstitial
          </button>
        </div>
        {editingInterstitialId === "new" ? (
          <InterstitialEditor
            draft={interstitialDraft}
            isSaving={isSaving}
            onCancel={() => setEditingInterstitialId("")}
            onChange={setInterstitialDraft}
            onSave={() => void saveInterstitial()}
          />
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInterstitials.map((interstitial) => (
                <tr key={interstitial.id}>
                  <td>{interstitial.displayOrder}</td>
                  <td><strong>{interstitial.name}</strong></td>
                  <td>{formatInterstitialType(interstitial.interstitialType)}</td>
                  <td>{formatInterstitialStatus(interstitial.status)}</td>
                  <td>{formatTemplateTimestamp(interstitial.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="crud-actions">
                      <button
                        aria-label="Edit interstitial"
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => {
                          setActiveSection("interstitials");
                          setEditingInterstitialId(interstitial.id);
                          setInterstitialDraft(interstitialToDraft(interstitial));
                        }}
                        title="Edit"
                        type="button"
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Delete interstitial"
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteInterstitial(interstitial)}
                        title="Delete"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedInterstitials.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading ? "Loading interstitials..." : "No interstitials found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {editingInterstitialId && editingInterstitialId !== "new" ? (
          <InterstitialEditor
            draft={interstitialDraft}
            isSaving={isSaving}
            onCancel={() => setEditingInterstitialId("")}
            onChange={setInterstitialDraft}
            onSave={() => void saveInterstitial()}
          />
        ) : null}
      </section>
      ) : null}
    </section>
  );
}
