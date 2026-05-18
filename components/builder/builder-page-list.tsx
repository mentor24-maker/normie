import type { BackgroundSettings, BuilderPageRecord, BuilderTemplateRecord } from "@/lib/builder-template";
import { useEffect, useRef, useState } from "react";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { formatTemplateTimestamp } from "./builder-utils";

type BuilderPageListProps = {
  pages: BuilderPageRecord[];
  templates: BuilderTemplateRecord[];
  selectedPageId: string;
  draftName: string;
  pageBackground: BackgroundSettings;
  pageSlug: string;
  pageTemplateId: string;
  isPublishedPage: boolean;
  isSaving: boolean;
  onSelectPage: (pageId: string) => void;
  onPreviewPage: (slug: string) => void;
  onDeletePage: (pageId: string, pageName: string) => void;
  onSetDraftName: (name: string) => void;
  onUpdatePageBackground: (updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onSetPageSlug: (slug: string) => void;
  onApplyTemplate: (templateId: string) => void;
  onSetIsPublished: (isPublished: boolean) => void;
  onNewPage: () => void;
  onMakeTemplate: () => void;
  onSavePage: () => void;
};

export function BuilderPageList({
  pages,
  templates,
  selectedPageId,
  draftName,
  pageBackground,
  pageSlug,
  pageTemplateId,
  isPublishedPage,
  isSaving,
  onSelectPage,
  onPreviewPage,
  onDeletePage,
  onSetDraftName,
  onUpdatePageBackground,
  onSetPageSlug,
  onApplyTemplate,
  onSetIsPublished,
  onNewPage,
  onMakeTemplate,
  onSavePage
}: BuilderPageListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    pages: true,
    details: true
  });
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusDetailsRef = useRef(false);

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function openDetailsAndFocus() {
    shouldFocusDetailsRef.current = true;
    setCollapsedPanels((current) => ({ ...current, details: false }));
  }

  function handleEditPage(pageId: string) {
    onSelectPage(pageId);
    openDetailsAndFocus();
  }

  function handleNewPage() {
    onNewPage();
    openDetailsAndFocus();
  }

  useEffect(() => {
    if (collapsedPanels.details || !shouldFocusDetailsRef.current) {
      return;
    }

    shouldFocusDetailsRef.current = false;
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [collapsedPanels.details, selectedPageId]);

  return (
    <>
      <div className="builder-toolbar-shell">
        <div className="builder-panel-toggle">
          <span className="panel-label">Pages</span>
          <span className="builder-panel-heading-actions">
            <button
              className="secondary-button builder-panel-heading-button"
              onClick={handleNewPage}
              type="button"
            >
              New Page
            </button>
          </span>
          <button
            aria-expanded={!collapsedPanels.pages}
            aria-label={collapsedPanels.pages ? "Expand Pages" : "Collapse Pages"}
            className="builder-panel-toggle-icon"
            onClick={() => togglePanel("pages")}
            title={collapsedPanels.pages ? "Expand Pages" : "Collapse Pages"}
            type="button"
          >
            {collapsedPanels.pages ? "▸" : "▾"}
          </button>
        </div>
        {!collapsedPanels.pages ? (
          <div className="table-shell builder-templates-shell">
            <table className="polls-table builder-templates-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Template</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const isSelected = page.id === selectedPageId;

                  return (
                    <tr className={isSelected ? "is-selected-row" : undefined} key={page.id}>
                      <td>
                        <strong>{page.name || "Untitled page"}</strong>
                      </td>
                      <td className="template-id-cell">
                        <code>/{page.slug}</code>
                      </td>
                      <td>{templates.find((template) => template.id === page.templateId)?.name || "Unknown"}</td>
                      <td>{formatTemplateTimestamp(page.updatedAt)}</td>
                      <td>
                        <div className="builder-template-actions">
                          <button
                            className="polls-icon-button"
                            onClick={() => handleEditPage(page.id)}
                            type="button"
                            aria-label={isSelected ? "Editing current page" : "Edit page"}
                            title={isSelected ? "Editing current page" : "Edit page"}
                          >
                            {isSelected ? "●" : "✎"}
                          </button>
                          <button
                            className="polls-icon-button"
                            onClick={() => onPreviewPage(page.slug)}
                            type="button"
                            aria-label="Preview page"
                            title="Preview page"
                          >
                            👁
                          </button>
                          <button
                            className="polls-icon-button polls-icon-button-danger"
                            onClick={() => onDeletePage(page.id, page.name)}
                            type="button"
                            disabled={isSaving}
                            aria-label="Delete page"
                            title="Delete page"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pages.length === 0 ? (
                  <tr>
                    <td className="empty-cell" colSpan={5}>No pages found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="builder-toolbar-shell">
        <div className="builder-panel-toggle">
          <span className="panel-label">Page Details</span>
          <span className="builder-panel-heading-actions">
            <button
              className="submit-button builder-panel-heading-button"
              disabled={isSaving}
              onClick={onSavePage}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Page"}
            </button>
          </span>
          <button
            aria-expanded={!collapsedPanels.details}
            aria-label={collapsedPanels.details ? "Expand Page Details" : "Collapse Page Details"}
            className="builder-panel-toggle-icon"
            onClick={() => togglePanel("details")}
            title={collapsedPanels.details ? "Expand Page Details" : "Collapse Page Details"}
            type="button"
          >
            {collapsedPanels.details ? "▸" : "▾"}
          </button>
        </div>
        {!collapsedPanels.details ? (
          <div className="builder-meta-grid builder-meta-grid-pages">
            <label className="field">
              <span>Page title</span>
              <input
                ref={titleInputRef}
                type="text"
                value={draftName}
                onChange={(event) => onSetDraftName(event.target.value)}
                placeholder="About Normie"
              />
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                type="text"
                value={pageSlug}
                onChange={(event) => onSetPageSlug(event.target.value)}
                placeholder="about"
              />
            </label>
            <label className="field">
              <span>Template</span>
              <select
                value={pageTemplateId}
                onChange={(event) => onApplyTemplate(event.target.value)}
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={isPublishedPage ? "published" : "draft"}
                onChange={(event) => onSetIsPublished(event.target.value === "published")}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <div className="builder-meta-actions">
              <button className="secondary-button" onClick={onMakeTemplate} type="button" disabled={isSaving}>
                Make Template
              </button>
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
