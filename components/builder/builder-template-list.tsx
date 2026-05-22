import type { BackgroundSettings, BuilderTemplateRecord } from "@/lib/builder-template";
import { useEffect, useRef, useState } from "react";
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
    templates: true,
    details: true
  });
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusDetailsRef = useRef(false);

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function openDetailsAndFocus() {
    shouldFocusDetailsRef.current = true;
    setCollapsedPanels((current) => ({ ...current, details: false }));
  }

  function handleEditTemplate(templateId: string) {
    onSelectTemplate(templateId);
    openDetailsAndFocus();
  }

  function handleNewTemplate() {
    onNewTemplate();
    openDetailsAndFocus();
  }

  useEffect(() => {
    if (collapsedPanels.details || !shouldFocusDetailsRef.current) {
      return;
    }

    shouldFocusDetailsRef.current = false;
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [collapsedPanels.details, selectedTemplateId]);

  return (
    <>
      <div className="builder-toolbar-shell">
        <div className="builder-panel-toggle-row">
          <button
            aria-expanded={!collapsedPanels.templates}
            aria-label={collapsedPanels.templates ? "Expand Templates" : "Collapse Templates"}
            className="builder-panel-toggle"
            onClick={() => togglePanel("templates")}
            title={collapsedPanels.templates ? "Expand Templates" : "Collapse Templates"}
            type="button"
          >
            <span className="panel-label">Templates</span>
            <span className="builder-panel-toggle-icon">{collapsedPanels.templates ? "▸" : "▾"}</span>
          </button>
          <span className="builder-panel-heading-actions">
            <button
              className="submit-button builder-panel-heading-button"
              onClick={handleNewTemplate}
              type="button"
            >
              New Template
            </button>
          </span>
        </div>
        {!collapsedPanels.templates ? (
          <div className="table-shell builder-templates-shell">
            <table className="polls-table builder-templates-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Updated</th>
                  <th className="crud-actions-cell">Actions</th>
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
                      <td className="crud-actions-cell">
                        <div className="builder-template-actions">
                          <button
                            className="polls-icon-button polls-icon-button-edit"
                            onClick={() => handleEditTemplate(template.id)}
                            type="button"
                            aria-label={isSelected ? "Editing current template" : "Edit template"}
                            title={isSelected ? "Editing current template" : "Edit template"}
                          >
                            {isSelected ? "●" : "✎"}
                          </button>
                          <button
                            className="polls-icon-button polls-icon-button-view"
                            onClick={() => onPreviewTemplate(template)}
                            type="button"
                            aria-label="Preview template"
                            title="Preview template"
                          >
                            <span aria-hidden="true" className="polls-icon-glyph-eye" />
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
        <div className="builder-panel-toggle-row">
          <button
            aria-expanded={!collapsedPanels.details}
            aria-label={collapsedPanels.details ? "Expand Template Details" : "Collapse Template Details"}
            className="builder-panel-toggle"
            onClick={() => togglePanel("details")}
            title={collapsedPanels.details ? "Expand Template Details" : "Collapse Template Details"}
            type="button"
          >
            <span className="panel-label">Template Details</span>
            <span className="builder-panel-toggle-icon">{collapsedPanels.details ? "▸" : "▾"}</span>
          </button>
          <span className="builder-panel-heading-actions">
            <button
              className="submit-button admin-blog-add-button builder-panel-heading-button"
              disabled={isSaving}
              onClick={onSaveTemplate}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Template"}
            </button>
          </span>
        </div>
        {!collapsedPanels.details ? (
          <div className="builder-meta-grid">
            <label className="field">
              <span>Template name</span>
              <input
                ref={nameInputRef}
                type="text"
                value={draftName}
                onChange={(event) => onSetDraftName(event.target.value)}
                placeholder="Homepage Variant A"
              />
            </label>
            <div className="builder-meta-actions">
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
                <button className="submit-button" onClick={onPreviewDraft} type="button">
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
