import { GameLevelDraft, LevelUpRuleDraft, ProgressiveFeatureDraft, formatGameLevelName, getSublevelsForLevel, normalizeSublevelOrder, reorderItems } from "./helpers";
import { useState, type DragEvent } from "react";

import type { GameLevel, GameLevelName, GameLevelUpCriterion, GameSublevel, GameScoringRule } from "@/lib/game-admin";
import { GAME_LEVEL_NAMES } from "@/lib/game-admin";

export function GameLevelEditor({
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

export function LevelUpRuleEditor({
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

export function ProgressiveFeatureEditor({
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

