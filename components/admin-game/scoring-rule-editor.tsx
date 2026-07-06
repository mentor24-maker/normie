import { ScoringRuleDraft } from "./helpers";

export function ScoringRuleEditor({
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

