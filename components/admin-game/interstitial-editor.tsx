import { InterstitialDraft, formatInterstitialStatus } from "./helpers";

import type { GameInterstitialStatus, GameInterstitialType } from "@/lib/game-admin";
import { GAME_INTERSTITIAL_STATUSES, GAME_INTERSTITIAL_TYPE_LABELS, GAME_INTERSTITIAL_TYPES } from "@/lib/game-admin";

import { BuilderSettingRow } from "@/components/builder/builder-setting-row";
import { AdminSurveyInterstitialFields } from "@/components/admin-survey-interstitial-fields";
import { createDefaultSurveyConfig, readSurveyConfigFromMetadata, writeSurveyConfigToMetadata, type GameInterstitialSurveyConfig } from "@/lib/game-interstitial-survey";

export function InterstitialEditor({
  draft,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: InterstitialDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: InterstitialDraft) => void;
  onSave: () => void;
}) {
  const surveyConfig = readSurveyConfigFromMetadata(draft.metadata);

  function updateSurveyConfig(nextSurvey: GameInterstitialSurveyConfig) {
    onChange({
      ...draft,
      metadata: writeSurveyConfigToMetadata(draft.metadata, nextSurvey)
    });
  }

  function handleTypeChange(nextType: GameInterstitialType) {
    const nextDraft: InterstitialDraft = { ...draft, interstitialType: nextType };

    if (nextType === "survey" && !draft.metadata?.survey) {
      nextDraft.metadata = writeSurveyConfigToMetadata(draft.metadata, createDefaultSurveyConfig());
    }

    onChange(nextDraft);
  }

  return (
    <div className="builder-product-editor admin-game-editor">
      <div className="admin-game-reward-grid">
        <BuilderSettingRow fullWidth label="Name">
          <input
            className="admin-game-reward-field-medium"
            type="text"
            value={draft.name ?? ""}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Welcome Back Promo"
          />
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Type">
          <select
            className="admin-game-reward-field-select"
            value={draft.interstitialType ?? "custom"}
            onChange={(event) => handleTypeChange(event.target.value as GameInterstitialType)}
          >
            {GAME_INTERSTITIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {GAME_INTERSTITIAL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Status">
          <select
            className="admin-game-reward-field-select"
            value={draft.status ?? "draft"}
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as GameInterstitialStatus })
            }
          >
            {GAME_INTERSTITIAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatInterstitialStatus(status)}
              </option>
            ))}
          </select>
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Display Order">
          <input
            className="admin-game-reward-field-number"
            min="1"
            type="number"
            value={draft.displayOrder ?? 1}
            onChange={(event) =>
              onChange({ ...draft, displayOrder: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </BuilderSettingRow>
        <BuilderSettingRow fullWidth label="Admin Notes">
          <textarea
            className="admin-game-reward-field-textarea"
            value={draft.description ?? ""}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            placeholder="Internal notes about when and why this interstitial should appear."
            rows={4}
          />
        </BuilderSettingRow>
      </div>

      {draft.interstitialType === "survey" ? (
        <AdminSurveyInterstitialFields onChange={updateSurveyConfig} survey={surveyConfig} />
      ) : (
        <p className="panel-copy admin-copy">
          Type-specific content and display rules will be configured in a follow-up pass.
        </p>
      )}
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Interstitial"}
        </button>
      </div>
    </div>
  );
}

