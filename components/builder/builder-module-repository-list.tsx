import type {
  BackgroundSettings,
  BuilderCellModuleRecord,
  BuilderProductRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateModule
} from "@/lib/builder-template";
import { Fragment, useState } from "react";
import { createDefaultBackgroundSettings } from "@/lib/builder-template";
import { BuilderModuleCard } from "./builder-module-card";
import { formatTemplateTimestamp } from "./builder-utils";

type BuilderModuleRepositoryListProps = {
  cellModules: BuilderCellModuleRecord[];
  products: BuilderProductRecord[];
  savedSections: BuilderSavedSectionRecord[];
  isSaving: boolean;
  onSaveSavedModule: (cellModuleId: string, name: string, modules: BuilderTemplateModule[]) => void;
  onDeleteSavedModule: (cellModuleId: string, currentName: string) => void;
  onRenameSavedSection: (sectionId: string, currentName: string) => void;
  onDeleteSavedSection: (sectionId: string, currentName: string) => void;
};

function getModuleSummary(cellModule: BuilderCellModuleRecord) {
  if (cellModule.modules.length === 1) {
    return cellModule.modules[0]?.type || "module";
  }

  return `${cellModule.modules.length} modules`;
}

function RepositoryTable({
  emptyLabel,
  items,
  products,
  isSaving,
  title,
  isCollapsed,
  editingId,
  editingName,
  editingModules,
  onToggle,
  onStartEditing,
  onCancelEditing,
  onSetEditingName,
  onUpdateEditingModule,
  onUpdateEditingModuleBackground,
  onSaveSavedModule,
  onDeleteSavedModule
}: {
  emptyLabel: string;
  items: BuilderCellModuleRecord[];
  products: BuilderProductRecord[];
  isSaving: boolean;
  title: string;
  isCollapsed: boolean;
  editingId: string;
  editingName: string;
  editingModules: BuilderTemplateModule[];
  onToggle: () => void;
  onStartEditing: (item: BuilderCellModuleRecord) => void;
  onCancelEditing: () => void;
  onSetEditingName: (name: string) => void;
  onUpdateEditingModule: (moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateEditingModuleBackground: (moduleId: string, updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onSaveSavedModule: BuilderModuleRepositoryListProps["onSaveSavedModule"];
  onDeleteSavedModule: BuilderModuleRepositoryListProps["onDeleteSavedModule"];
}) {
  return (
    <div className="builder-toolbar-shell">
      <button
        aria-expanded={!isCollapsed}
        className="builder-panel-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="panel-label">{title}</span>
        <span className="builder-panel-toggle-icon">{isCollapsed ? "▸" : "▾"}</span>
      </button>
      {!isCollapsed ? (
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contents</th>
                <th>ID</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "Untitled saved module"}</strong>
                    </td>
                    <td>{getModuleSummary(item)}</td>
                    <td className="template-id-cell">
                      <code>{item.id}</code>
                    </td>
                    <td>{formatTemplateTimestamp(item.updatedAt)}</td>
                    <td>
                      <div className="builder-template-actions">
                        <button
                          aria-label="Edit saved module"
                          className="polls-icon-button"
                          disabled={isSaving}
                          onClick={() => onStartEditing(item)}
                          title="Edit module"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Delete saved module"
                          className="polls-icon-button polls-icon-button-danger"
                          disabled={isSaving}
                          onClick={() => onDeleteSavedModule(item.id, item.name)}
                          title="Delete"
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === item.id ? (
                    <tr key={`${item.id}-editor`}>
                      <td colSpan={5}>
                        <div className="builder-saved-module-editor">
                          <div className="builder-meta-grid">
                            <label className="field">
                              <span>Saved module name</span>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(event) => onSetEditingName(event.target.value)}
                              />
                            </label>
                            <div className="builder-meta-actions">
                              <button className="secondary-button" onClick={onCancelEditing} type="button">
                                Cancel
                              </button>
                              <button
                                className="submit-button"
                                disabled={isSaving}
                                onClick={() => onSaveSavedModule(item.id, editingName, editingModules)}
                                type="button"
                              >
                                {isSaving ? "Saving..." : "Save Module"}
                              </button>
                            </div>
                          </div>
                          <div className="builder-saved-module-editor-stack">
                            {editingModules.map((module) => (
                              <BuilderModuleCard
                                editorDevice="browser"
                                hideHeaderActions
                                isExpanded
                                key={module.id}
                                module={module}
                                products={products}
                                onClone={() => undefined}
                                onMoveDown={() => undefined}
                                onMoveUp={() => undefined}
                                onOpenGallery={() => undefined}
                                onOpenSocialIconGallery={() => undefined}
                                onRemove={() => undefined}
                                onSaveModule={() => undefined}
                                onToggleExpanded={() => undefined}
                                onUpdateModule={(updater) => onUpdateEditingModule(module.id, updater)}
                                onUpdateModuleBackground={(updater) => onUpdateEditingModuleBackground(module.id, updater)}
                                onUploadMedia={() => undefined}
                                sectionId="saved-module-editor"
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>{emptyLabel}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function BuilderModuleRepositoryList({
  cellModules,
  products,
  savedSections,
  isSaving,
  onSaveSavedModule,
  onDeleteSavedModule,
  onRenameSavedSection,
  onDeleteSavedSection
}: BuilderModuleRepositoryListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    modules: false,
    cells: false,
    sections: false
  });
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingModules, setEditingModules] = useState<BuilderTemplateModule[]>([]);
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function startEditing(item: BuilderCellModuleRecord) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingModules(item.modules.map((module) => ({ ...module, settings: { ...module.settings } })));
  }

  function cancelEditing() {
    setEditingId("");
    setEditingName("");
    setEditingModules([]);
  }

  function updateEditingModule(moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) {
    setEditingModules((current) => current.map((module) => (module.id === moduleId ? updater(module) : module)));
  }

  function updateEditingModuleBackground(
    moduleId: string,
    updater: (background: BackgroundSettings) => BackgroundSettings
  ) {
    updateEditingModule(moduleId, (module) => {
      const background = {
        mode: (module.settings.backgroundMode as BackgroundSettings["mode"]) || "none",
        color: module.settings.backgroundColor || "#ffffff",
        color2: module.settings.backgroundColor2 || "#eaf4ff",
        imageUrl: module.settings.backgroundImageUrl || "",
        styleKey: module.settings.backgroundStyleKey === "blue-yellow-circles" ? "blue-yellow-circles" : ""
      } satisfies BackgroundSettings;
      const next = updater(background);

      return {
        ...module,
        settings: {
          ...module.settings,
          backgroundMode: next.mode,
          backgroundColor: next.color,
          backgroundColor2: next.color2,
          backgroundImageUrl: next.imageUrl,
          backgroundStyleKey: next.styleKey
        }
      };
    });
  }

  return (
    <>
      <RepositoryTable
        emptyLabel="No saved modules found."
        isCollapsed={collapsedPanels.modules}
        isSaving={isSaving}
        items={savedModules}
        products={products}
        editingId={editingId}
        editingName={editingName}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("modules")}
        onUpdateEditingModule={updateEditingModule}
        onUpdateEditingModuleBackground={updateEditingModuleBackground}
        title="Saved Modules"
      />
      <RepositoryTable
        emptyLabel="No saved cells found."
        isCollapsed={collapsedPanels.cells}
        isSaving={isSaving}
        items={savedCells}
        products={products}
        editingId={editingId}
        editingName={editingName}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("cells")}
        onUpdateEditingModule={updateEditingModule}
        onUpdateEditingModuleBackground={updateEditingModuleBackground}
        title="Saved Cells"
      />
      <div className="builder-toolbar-shell">
        <button
          aria-expanded={!collapsedPanels.sections}
          className="builder-panel-toggle"
          onClick={() => togglePanel("sections")}
          type="button"
        >
          <span className="panel-label">Saved Sections</span>
          <span className="builder-panel-toggle-icon">{collapsedPanels.sections ? "▸" : "▾"}</span>
        </button>
        {!collapsedPanels.sections ? (
          <div className="table-shell builder-templates-shell">
            <table className="polls-table builder-templates-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Layout</th>
                  <th>Modules</th>
                  <th>ID</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedSections.map((section) => (
                  <tr key={section.id}>
                    <td>
                      <strong>{section.name || "Untitled saved section"}</strong>
                    </td>
                    <td>{section.section.layout}</td>
                    <td>{section.section.modules.length}</td>
                    <td className="template-id-cell">
                      <code>{section.id}</code>
                    </td>
                    <td>{formatTemplateTimestamp(section.updatedAt)}</td>
                    <td>
                      <div className="builder-template-actions">
                        <button
                          aria-label="Rename saved section"
                          className="polls-icon-button"
                          disabled={isSaving}
                          onClick={() => onRenameSavedSection(section.id, section.name)}
                          title="Rename"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Delete saved section"
                          className="polls-icon-button polls-icon-button-danger"
                          disabled={isSaving}
                          onClick={() => onDeleteSavedSection(section.id, section.name)}
                          title="Delete"
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {savedSections.length === 0 ? (
                  <tr>
                    <td className="empty-cell" colSpan={6}>No saved sections found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
