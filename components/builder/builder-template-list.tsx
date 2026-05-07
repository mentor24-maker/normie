import type { BuilderTemplateRecord } from "@/lib/builder-template";
import { formatTemplateTimestamp } from "./builder-utils";

type BuilderTemplateListProps = {
  templates: BuilderTemplateRecord[];
  selectedTemplateId: string;
  draftName: string;
  isSaving: boolean;
  onSelectTemplate: (templateId: string) => void;
  onPreviewTemplate: (template: BuilderTemplateRecord) => void;
  onDeleteTemplate: (templateId: string, templateName: string) => void;
  onSetDraftName: (name: string) => void;
  onNewTemplate: () => void;
  onSaveTemplate: () => void;
};

export function BuilderTemplateList({
  templates,
  selectedTemplateId,
  draftName,
  isSaving,
  onSelectTemplate,
  onPreviewTemplate,
  onDeleteTemplate,
  onSetDraftName,
  onNewTemplate,
  onSaveTemplate
}: BuilderTemplateListProps) {
  return (
    <>
      <div className="builder-toolbar-shell">
        <div className="panel-label">Templates</div>
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const isSelected = template.id === selectedTemplateId;

                return (
                  <tr className={isSelected ? "is-selected-row" : undefined} key={template.id}>
                    <td>
                      <strong>{template.name || "Untitled template"}</strong>
                    </td>
                    <td className="template-id-cell">
                      <code>{template.id}</code>
                    </td>
                    <td>{formatTemplateTimestamp(template.updatedAt)}</td>
                    <td>
                      <div className="builder-template-actions">
                        <button
                          className="polls-icon-button"
                          onClick={() => onPreviewTemplate(template)}
                          type="button"
                          aria-label="Preview template"
                          title="Preview template"
                        >
                          👁
                        </button>
                        <button
                          className="polls-icon-button"
                          onClick={() => onSelectTemplate(template.id)}
                          type="button"
                          aria-label={isSelected ? "Editing current template" : "Edit template"}
                          title={isSelected ? "Editing current template" : "Edit template"}
                        >
                          {isSelected ? "●" : "✎"}
                        </button>
                        <button
                          className="polls-icon-button polls-icon-button-danger"
                          onClick={() => onDeleteTemplate(template.id, template.name)}
                          type="button"
                          disabled={isSaving}
                          aria-label="Delete template"
                          title="Delete template"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {templates.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={4}>No templates found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="builder-meta-grid">
        <label className="field">
          <span>Template name</span>
          <input
            type="text"
            value={draftName}
            onChange={(event) => onSetDraftName(event.target.value)}
            placeholder="Homepage Variant A"
          />
        </label>
        <div className="builder-meta-actions">
          <button className="secondary-button" onClick={onNewTemplate} type="button">
            New Template
          </button>
          <button className="submit-button" onClick={onSaveTemplate} type="button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </>
  );
}
