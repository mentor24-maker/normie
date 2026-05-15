import type { BackgroundSettings, BuilderTemplateRecord } from "@/lib/builder-template";
import { useState } from "react";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { formatTemplateTimestamp } from "./builder-utils";

type BuilderTemplateListProps = {
  templates: BuilderTemplateRecord[];
  selectedTemplateId: string;
  draftName: string;
  pageBackground: BackgroundSettings;
  previewDevice: "desktop" | "mobile";
  isSaving: boolean;
  onSelectTemplate: (templateId: string) => void;
  onPreviewTemplate: (template: BuilderTemplateRecord) => void;
  onDeleteTemplate: (templateId: string, templateName: string) => void;
  onSetDraftName: (name: string) => void;
  onUpdatePageBackground: (updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onSetPreviewDevice: (device: "desktop" | "mobile") => void;
  onPreviewDraft: () => void;
  onNewTemplate: () => void;
  onSaveTemplate: () => void;
};

export function BuilderTemplateList({
  templates,
  selectedTemplateId,
  draftName,
  pageBackground,
  previewDevice,
  isSaving,
  onSelectTemplate,
  onPreviewTemplate,
  onDeleteTemplate,
  onSetDraftName,
  onUpdatePageBackground,
  onSetPreviewDevice,
  onPreviewDraft,
  onNewTemplate,
  onSaveTemplate
}: BuilderTemplateListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    templates: false,
    details: false
  });

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  return (
    <>
      <div className="builder-toolbar-shell">
        <button
          aria-expanded={!collapsedPanels.templates}
          className="builder-panel-toggle"
          onClick={() => togglePanel("templates")}
          type="button"
        >
          <span className="panel-label">Templates</span>
          <span className="builder-panel-toggle-icon">{collapsedPanels.templates ? "▸" : "▾"}</span>
        </button>
        {!collapsedPanels.templates ? (
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
        ) : null}
      </div>

      <div className="builder-toolbar-shell">
        <button
          aria-expanded={!collapsedPanels.details}
          className="builder-panel-toggle"
          onClick={() => togglePanel("details")}
          type="button"
        >
          <span className="panel-label">Template Details</span>
          <span className="builder-panel-toggle-icon">{collapsedPanels.details ? "▸" : "▾"}</span>
        </button>
        {!collapsedPanels.details ? (
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
              <div className="builder-template-preview-controls">
                <fieldset className="builder-preview-radio-group" aria-label="Preview device">
                  <label>
                    <input
                      checked={previewDevice === "desktop"}
                      name="template-preview-device"
                      onChange={() => onSetPreviewDevice("desktop")}
                      type="radio"
                    />
                    <span>Desktop</span>
                  </label>
                  <label>
                    <input
                      checked={previewDevice === "mobile"}
                      name="template-preview-device"
                      onChange={() => onSetPreviewDevice("mobile")}
                      type="radio"
                    />
                    <span>Mobile</span>
                  </label>
                </fieldset>
                <button className="secondary-button" onClick={onPreviewDraft} type="button">
                  Preview
                </button>
              </div>
            </div>
            <BuilderBackgroundControls
              label="Page Background"
              background={pageBackground}
              compact
              onChange={onUpdatePageBackground}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
