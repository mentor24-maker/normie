import { LEVEL_TIER_OPTIONS, LevelEventDraft, applyProgressionToLevelEventDraft } from "./helpers";

import { AdminGameAudienceField } from "@/components/admin-game-audience-field";
import type { GameAudience } from "@/lib/game-audience";
import type { GameEventModule } from "@/lib/game-admin";

import { DEFAULT_EVENT_POLLS_PER_LEVEL, formatProgressionMilestone, progressPollsAtEvent } from "@/lib/player-progression-tiers";
import { PLAYER_LEVELS_PER_GRADE } from "@/lib/player-portal";

import { BuilderSettingRow } from "@/components/builder/builder-setting-row";

export function LevelEventEditor({
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
      <div className="admin-game-editor-header">
        <strong>{draft.id ? "Edit Event" : "New Event"}</strong>
        <button
          aria-label="Close event editor"
          className="polls-icon-button polls-icon-button-view admin-game-editor-close"
          disabled={isSaving}
          onClick={onCancel}
          title="Close"
          type="button"
        >
          ×
        </button>
      </div>
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

