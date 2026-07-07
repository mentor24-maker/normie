"use client";

import { Fragment, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type {
  GameEventModule,
  GameLevel,
  GameLevelEvent,
  GameLevelUpRule,
  GameProgressiveFeature,
  GameScoringRule
} from "@/lib/game-admin";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";
import { eventTargetProgressPolls } from "@/lib/player-progression-tiers";
import {
  LEVEL_EVENT_TABLE_COLUMNS,
  applyProgressionToLevelEventDraft,
  compareLevelEvents,
  createLevelEventDraft,
  createLevelUpRuleDraft,
  createProgressiveFeatureDraft,
  formatGameLevelName,
  formatLevelEventMilestoneCompact,
  formatLevelUpCriteria,
  getEventModuleCategory,
  getLevelEventProgression,
  levelEventProgressPolls,
  levelEventToDraft,
  levelUpRuleToDraft,
  progressiveFeatureToDraft,
  type LevelEventDraft,
  type LevelEventModuleCategory,
  type LevelEventSortKey,
  type LevelUpRuleDraft,
  type ProgressiveFeatureDraft,
  type SortDirection
} from "./helpers";
import { AdminTableSortButton } from "./table-sort-button";
import { LevelUpRuleEditor, ProgressiveFeatureEditor } from "./level-editors";
import { LevelEventEditor } from "./level-event-editor";

type LevelUpSectionProps = {
  levelUpRules: GameLevelUpRule[];
  setLevelUpRules: Dispatch<SetStateAction<GameLevelUpRule[]>>;
  levelEvents: GameLevelEvent[];
  setLevelEvents: Dispatch<SetStateAction<GameLevelEvent[]>>;
  progressiveFeatures: GameProgressiveFeature[];
  setProgressiveFeatures: Dispatch<SetStateAction<GameProgressiveFeature[]>>;
  gameLevels: GameLevel[];
  scoringRules: GameScoringRule[];
  eventModules: GameEventModule[];
  isLoading: boolean;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

export function LevelUpSection({
  levelUpRules,
  setLevelUpRules,
  levelEvents,
  setLevelEvents,
  progressiveFeatures,
  setProgressiveFeatures,
  gameLevels,
  scoringRules,
  eventModules,
  isLoading,
  isSaving,
  setIsSaving,
  setError,
  setMessage
}: LevelUpSectionProps) {
  const [editingLevelUpRuleId, setEditingLevelUpRuleId] = useState("");
  const [editingLevelEventId, setEditingLevelEventId] = useState("");
  const [editingProgressiveFeatureId, setEditingProgressiveFeatureId] = useState("");
  const [levelUpRuleDraft, setLevelUpRuleDraft] = useState<LevelUpRuleDraft>(createLevelUpRuleDraft());
  const [levelEventDraft, setLevelEventDraft] = useState<LevelEventDraft>(createLevelEventDraft());
  const [progressiveFeatureDraft, setProgressiveFeatureDraft] = useState<ProgressiveFeatureDraft>(createProgressiveFeatureDraft());
  const [levelEventQuery, setLevelEventQuery] = useState("");
  const [levelEventGradeFilter, setLevelEventGradeFilter] = useState("");
  const [levelEventLevelFilter, setLevelEventLevelFilter] = useState("");
  const [levelEventStatusFilter, setLevelEventStatusFilter] = useState<"" | "active" | "draft">("");
  const [levelEventModuleCategoryFilter, setLevelEventModuleCategoryFilter] = useState<LevelEventModuleCategory>("");
  const [levelEventSortKey, setLevelEventSortKey] = useState<LevelEventSortKey>("updatedAt");
  const [levelEventSortDirection, setLevelEventSortDirection] = useState<SortDirection>("desc");

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function handleLevelEventSort(nextKey: LevelEventSortKey) {
    if (levelEventSortKey === nextKey) {
      setLevelEventSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setLevelEventSortKey(nextKey);
    setLevelEventSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  function startNewLevelUpRule() {
    resetMessages();
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

    setEditingLevelEventId("new");
    setLevelEventDraft(createLevelEventDraft(gameLevels, eventModules));
  }

  function startNewProgressiveFeature() {
    resetMessages();
    setEditingProgressiveFeatureId("new");
    setProgressiveFeatureDraft(createProgressiveFeatureDraft(gameLevels));
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

  const hasLevelEventFilters = Boolean(
    levelEventQuery.trim() ||
    levelEventGradeFilter ||
    levelEventLevelFilter ||
    levelEventStatusFilter ||
    levelEventModuleCategoryFilter
  );


  return (
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

  );
}
