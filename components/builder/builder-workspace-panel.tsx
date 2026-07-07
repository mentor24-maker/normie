"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import { getLayoutColumns, getLayoutGridTemplate } from "@/lib/builder-template";
import type {
  BuilderCellModuleRecord,
  BuilderProductRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateLayout
} from "@/lib/builder-template";
import { BuilderCollapseIcon } from "./builder-collapse-icon";
import { BuilderSectionCard } from "./builder-section-card";
import { layoutOptions, type BuilderDraft } from "./builder-types";
import type { useBuilderDraftOps, BuilderPanelKey } from "./use-builder-draft-ops";
import type { useBuilderMediaModals } from "./use-builder-media-modals";

type BuilderDraftOps = ReturnType<typeof useBuilderDraftOps>;
type BuilderMediaModals = ReturnType<typeof useBuilderMediaModals>;

type BuilderWorkspacePanelProps = {
  draft: BuilderDraft;
  isEmailTemplateDraft: boolean;
  previewDevice: "desktop" | "mobile" | "email";
  collapsedBuilderPanels: Record<BuilderPanelKey, boolean>;
  collapsedSectionIds: string[];
  expandedModuleIds: string[];
  cellModules: BuilderCellModuleRecord[];
  savedSections: BuilderSavedSectionRecord[];
  products: BuilderProductRecord[];
  savedSectionSelectKey: number;
  draftOps: BuilderDraftOps;
  mediaModals: BuilderMediaModals;
  saveSection: (sectionId: string) => Promise<void>;
  saveCellModules: (sectionId: string, column: string) => Promise<void>;
  saveModule: (sectionId: string, moduleId: string) => Promise<void>;
};

/**
 * The Workspace pod (Row Layouts + Rows) shared by the Pages and Templates
 * builder modes. JSX moved verbatim from admin-builder-editor.tsx; the
 * editor passes its draft-ops and media-modal hook results wholesale.
 */
export function BuilderWorkspacePanel({
  draft,
  isEmailTemplateDraft,
  previewDevice,
  collapsedBuilderPanels,
  collapsedSectionIds,
  expandedModuleIds,
  cellModules,
  savedSections,
  products,
  savedSectionSelectKey,
  draftOps,
  mediaModals,
  saveSection,
  saveCellModules,
  saveModule
}: BuilderWorkspacePanelProps) {
  const {
    toggleBuilderPanel,
    handleSavedSectionSelect,
    addSection,
    toggleSectionCollapsed,
    moveSection,
    removeSection,
    updateSection,
    cloneSection,
    updateCellBackground,
    updateCellPadding,
    updateCellBorderWidth,
    updateCellBorderColor,
    updateCellBorderRadius,
    toggleModuleExpanded,
    updateModule,
    updateModuleBackground,
    moveModule,
    dropModule,
    removeModule,
    cloneModule,
    insertCellModule,
    insertSavedModule
  } = draftOps;
  const {
    openGallery,
    openRichTextGallery,
    uploadRichTextGalleryImage,
    openButtonBackgroundGallery,
    openSocialIconGallery,
    uploadMediaForModule,
    uploadButtonBackgroundMedia,
    openSectionBackgroundGallery,
    uploadMediaForSectionBackground,
    openModulePalette
  } = mediaModals;

  const [dragOverWorkspace, setDragOverWorkspace] = useState(false);

  function handleLayoutDragStart(layout: BuilderTemplateLayout, event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", layout);
  }

  function handleWorkspaceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const layout = event.dataTransfer.getData("text/plain") as BuilderTemplateLayout;
    if (layout) addSection(layout);
    setDragOverWorkspace(false);
  }

  function renderLayoutTile(layout: { value: BuilderTemplateLayout; label: string }) {
    const columns = getLayoutColumns(layout.value);
    const gridTemplateColumns = getLayoutGridTemplate(layout.value);
    return (
      <button className="builder-layout-tile" draggable key={layout.value} onClick={() => addSection(layout.value)} onDragStart={(event) => handleLayoutDragStart(layout.value, event)} type="button">
        <span className={`builder-layout-icon builder-layout-icon-${columns.length}`} style={{ gridTemplateColumns }}>
          {columns.map((column) => (<span className="builder-layout-bar" key={column} />))}
        </span>
        <span className="builder-layout-label">{layout.label}</span>
      </button>
    );
  }

  return (

        <>
          <div className="builder-toolbar-shell builder-workspace-shell">
            <button
              aria-expanded={!collapsedBuilderPanels.workspace}
              className="builder-panel-toggle"
              onClick={() => toggleBuilderPanel("workspace")}
              type="button"
            >
              <span className="panel-label">Workspace</span>
              <span className="builder-panel-toggle-icon"><BuilderCollapseIcon expanded={!collapsedBuilderPanels.workspace} /></span>
            </button>
            {!collapsedBuilderPanels.workspace ? (
              <div className="builder-workspace-pods">
                <div className="builder-workspace-nested-pod">
                  <button
                    aria-expanded={!collapsedBuilderPanels.rowConfigurations}
                    className="builder-panel-toggle"
                    onClick={() => toggleBuilderPanel("rowConfigurations")}
                    type="button"
                  >
                    <span className="panel-label">Row Layouts</span>
                    <span className="builder-panel-toggle-icon"><BuilderCollapseIcon expanded={!collapsedBuilderPanels.rowConfigurations} /></span>
                  </button>
                  {!collapsedBuilderPanels.rowConfigurations ? (
                    <div className="builder-layout-toolbar">
                      {layoutOptions.map((layout) => renderLayoutTile(layout))}
                      <label className="field builder-cell-repository-select">
                        <select
                          key={savedSectionSelectKey}
                          defaultValue=""
                          onChange={handleSavedSectionSelect}
                        >
                          <option disabled value="">
                            Saved Section
                          </option>
                          {savedSections.map((savedSection) => (
                            <option key={savedSection.id} value={savedSection.id}>
                              {savedSection.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="builder-workspace-nested-pod builder-rows-pod">
                  <button
                    aria-expanded={!collapsedBuilderPanels.rows}
                    className="builder-panel-toggle"
                    onClick={() => toggleBuilderPanel("rows")}
                    type="button"
                  >
                    <span className="panel-label">Rows</span>
                    <span className="builder-panel-toggle-icon"><BuilderCollapseIcon expanded={!collapsedBuilderPanels.rows} /></span>
                  </button>
                  {!collapsedBuilderPanels.rows ? (
                    <div
                      className={`builder-main builder-workspace ${isEmailTemplateDraft ? "builder-email-workspace" : ""} ${dragOverWorkspace ? "is-drag-over" : ""}`}
                      onDragOver={(event) => { event.preventDefault(); setDragOverWorkspace(true); }}
                      onDragLeave={() => setDragOverWorkspace(false)}
                      onDrop={handleWorkspaceDrop}
                    >
                {isEmailTemplateDraft ? (
                  <div className="builder-email-workspace-pod">
                    {draft.layoutSections.length === 0 ? (
                      <div className="builder-workspace-empty">
                        <div className="builder-workspace-empty-title">Drop a row onto the email pod</div>
                        <div className="builder-workspace-empty-copy">Email templates render inside a 600px-wide pod. Add rows and modules the same way as page templates.</div>
                      </div>
                    ) : (
                      <div className="builder-sections">
                        {draft.layoutSections.map((section, sectionIndex) => (
                          <BuilderSectionCard
                            isEmailTemplate
                            key={section.id}
                            section={section}
                            sectionIndex={sectionIndex}
                            editorDevice="browser"
                            isCollapsed={collapsedSectionIds.includes(section.id)}
                            expandedModuleIds={expandedModuleIds}
                            onToggleCollapsed={() => toggleSectionCollapsed(section.id)}
                            onMoveUp={() => moveSection(section.id, -1)}
                            onMoveDown={() => moveSection(section.id, 1)}
                            onRemove={() => removeSection(section.id)}
                            onUpdateSection={(updater) => updateSection(section.id, updater)}
                            onCloneSection={() => cloneSection(section.id)}
                            onSaveSection={() => void saveSection(section.id)}
                            onUpdateCellBackground={(col, updater) => updateCellBackground(section.id, col, updater)}
                            onUpdateCellPadding={(col, value) => updateCellPadding(section.id, col, value)}
                            onUpdateCellBorderWidth={(col, value) => updateCellBorderWidth(section.id, col, value)}
                            onUpdateCellBorderColor={(col, value) => updateCellBorderColor(section.id, col, value)}
                            onUpdateCellBorderRadius={(col, value) => updateCellBorderRadius(section.id, col, value)}
                            onToggleModuleExpanded={toggleModuleExpanded}
                            onUpdateModule={(moduleId, updater) => updateModule(section.id, moduleId, updater)}
                            onUpdateModuleBackground={(moduleId, updater) => updateModuleBackground(section.id, moduleId, updater)}
                            onMoveModule={(moduleId, dir) => moveModule(section.id, moduleId, dir)}
                            onDropModule={dropModule}
                            onRemoveModule={(moduleId) => removeModule(section.id, moduleId)}
                            onCloneModule={(sectionId, moduleId) => cloneModule(sectionId, moduleId)}
                            onSaveModule={(moduleId) => void saveModule(section.id, moduleId)}
                            cellModules={cellModules}
                            products={products}
                            onSaveCellModules={(col) => void saveCellModules(section.id, col)}
                            onInsertCellModule={(col, cellModuleId) => insertCellModule(section.id, col, cellModuleId)}
                            onInsertSavedModule={(col, cellModuleId) => insertSavedModule(section.id, col, cellModuleId)}
                            onOpenGallery={(moduleId) => openGallery(section.id, moduleId)}
                            onOpenRichTextGallery={(moduleId, anchor) =>
                              openRichTextGallery(section.id, moduleId, anchor)
                            }
                            onUploadRichTextGalleryImage={uploadRichTextGalleryImage}
                            onOpenButtonBackgroundGallery={(moduleId) => openButtonBackgroundGallery(section.id, moduleId)}
                            onOpenSocialIconGallery={(moduleId, itemId) => openSocialIconGallery(section.id, moduleId, itemId)}
                            onUploadMediaForModule={(moduleId, file) => uploadMediaForModule(section.id, moduleId, file)}
                            onUploadButtonBackgroundMedia={(moduleId, file) =>
                              uploadButtonBackgroundMedia(section.id, moduleId, file)
                            }
                            onOpenSectionBackgroundGallery={() => openSectionBackgroundGallery(section.id)}
                            onUploadSectionBackgroundMedia={(file) => uploadMediaForSectionBackground(section.id, file)}
                            onOpenModulePalette={(col, anchor) => openModulePalette(section.id, col, anchor)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : draft.layoutSections.length === 0 ? (
                  <div className="builder-workspace-empty">
                    <div className="builder-workspace-empty-title">Drop a row onto the workspace</div>
                    <div className="builder-workspace-empty-copy">Drag a row layout from Row Layouts above, or click one to add it instantly.</div>
                  </div>
                ) : (
                  <div className="builder-sections">
                    {draft.layoutSections.map((section, sectionIndex) => (
                      <BuilderSectionCard
                        isEmailTemplate={isEmailTemplateDraft}
                        key={section.id}
                        section={section}
                        sectionIndex={sectionIndex}
                        editorDevice={previewDevice === "mobile" ? "mobile" : "browser"}
                        isCollapsed={collapsedSectionIds.includes(section.id)}
                        expandedModuleIds={expandedModuleIds}
                        onToggleCollapsed={() => toggleSectionCollapsed(section.id)}
                        onMoveUp={() => moveSection(section.id, -1)}
                        onMoveDown={() => moveSection(section.id, 1)}
                        onRemove={() => removeSection(section.id)}
                        onUpdateSection={(updater) => updateSection(section.id, updater)}
                        onCloneSection={() => cloneSection(section.id)}
                        onSaveSection={() => void saveSection(section.id)}
                        onUpdateCellBackground={(col, updater) => updateCellBackground(section.id, col, updater)}
                        onUpdateCellPadding={(col, value) => updateCellPadding(section.id, col, value)}
                        onUpdateCellBorderWidth={(col, value) => updateCellBorderWidth(section.id, col, value)}
                        onUpdateCellBorderColor={(col, value) => updateCellBorderColor(section.id, col, value)}
                        onUpdateCellBorderRadius={(col, value) => updateCellBorderRadius(section.id, col, value)}
                        onToggleModuleExpanded={toggleModuleExpanded}
                        onUpdateModule={(moduleId, updater) => updateModule(section.id, moduleId, updater)}
                        onUpdateModuleBackground={(moduleId, updater) => updateModuleBackground(section.id, moduleId, updater)}
                        onMoveModule={(moduleId, dir) => moveModule(section.id, moduleId, dir)}
                        onDropModule={dropModule}
                        onRemoveModule={(moduleId) => removeModule(section.id, moduleId)}
                        onCloneModule={(sectionId, moduleId) => cloneModule(sectionId, moduleId)}
                        onSaveModule={(moduleId) => void saveModule(section.id, moduleId)}
                        cellModules={cellModules}
                        products={products}
                        onSaveCellModules={(col) => void saveCellModules(section.id, col)}
                        onInsertCellModule={(col, cellModuleId) => insertCellModule(section.id, col, cellModuleId)}
                        onInsertSavedModule={(col, cellModuleId) => insertSavedModule(section.id, col, cellModuleId)}
                        onOpenGallery={(moduleId) => openGallery(section.id, moduleId)}
                        onOpenRichTextGallery={(moduleId, anchor) =>
                          openRichTextGallery(section.id, moduleId, anchor)
                        }
                        onUploadRichTextGalleryImage={uploadRichTextGalleryImage}
                        onOpenButtonBackgroundGallery={(moduleId) => openButtonBackgroundGallery(section.id, moduleId)}
                        onOpenSocialIconGallery={(moduleId, itemId) => openSocialIconGallery(section.id, moduleId, itemId)}
                        onUploadMediaForModule={(moduleId, file) => uploadMediaForModule(section.id, moduleId, file)}
                        onUploadButtonBackgroundMedia={(moduleId, file) =>
                          uploadButtonBackgroundMedia(section.id, moduleId, file)
                        }
                        onOpenSectionBackgroundGallery={() => openSectionBackgroundGallery(section.id)}
                        onUploadSectionBackgroundMedia={(file) => uploadMediaForSectionBackground(section.id, file)}
                        onOpenModulePalette={(col, anchor) => openModulePalette(section.id, col, anchor)}
                      />
                    ))}
                  </div>
                )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </>
      
  );
}
