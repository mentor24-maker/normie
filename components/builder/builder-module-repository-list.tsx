import type { AdminMediaItem } from "@/lib/admin-media";
import type {
  BackgroundSettings,
  BuilderCellModuleRecord,
  BuilderProductRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateModule,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { Fragment, useState } from "react";
import { createDefaultBackgroundSettings, createEmptyModule, normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { BuilderGalleryModal } from "./builder-gallery-modal";
import { BuilderModuleCard } from "./builder-module-card";
import { BuilderModulePaletteModal } from "./builder-module-palette-modal";
import { BuilderSectionCard } from "./builder-section-card";
import { formatTemplateTimestamp } from "./builder-utils";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";

type BuilderModuleRepositoryListProps = {
  cellModules: BuilderCellModuleRecord[];
  products: BuilderProductRecord[];
  galleryMedia: AdminMediaItem[];
  isUploadingMedia: boolean;
  savedSections: BuilderSavedSectionRecord[];
  isSaving: boolean;
  onSaveSavedModule: (cellModuleId: string, name: string, modules: BuilderTemplateModule[]) => void;
  onCreateSavedModule: (name: string, modules: BuilderTemplateModule[]) => void;
  onDeleteSavedModule: (cellModuleId: string, currentName: string) => void;
  onSaveSavedSection: (sectionId: string, name: string, section: BuilderTemplateSection) => void;
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
  editingExpandedModuleIds,
  editingModules,
  onToggle,
  onToggleEditingModuleExpanded,
  onStartEditing,
  onCancelEditing,
  onSetEditingName,
  onUpdateEditingModule,
  onUpdateEditingModuleBackground,
  onOpenEditingModuleGallery,
  onOpenEditingSocialIconGallery,
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
  editingExpandedModuleIds: string[];
  editingModules: BuilderTemplateModule[];
  onToggle: () => void;
  onToggleEditingModuleExpanded: (moduleId: string) => void;
  onStartEditing: (item: BuilderCellModuleRecord) => void;
  onCancelEditing: () => void;
  onSetEditingName: (name: string) => void;
  onUpdateEditingModule: (moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateEditingModuleBackground: (moduleId: string, updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onOpenEditingModuleGallery: (moduleId: string) => void;
  onOpenEditingSocialIconGallery: (moduleId: string, itemId: string) => void;
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
                                isExpanded={editingExpandedModuleIds.includes(module.id)}
                                key={module.id}
                                module={module}
                                products={products}
                                onClone={() => undefined}
                                onMoveDown={() => undefined}
                                onMoveUp={() => undefined}
                                onOpenGallery={() => onOpenEditingModuleGallery(module.id)}
                                onOpenSocialIconGallery={(itemId) => onOpenEditingSocialIconGallery(module.id, itemId)}
                                onRemove={() => undefined}
                                onSaveModule={() => undefined}
                                onToggleExpanded={() => onToggleEditingModuleExpanded(module.id)}
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
  galleryMedia,
  isUploadingMedia,
  savedSections,
  isSaving,
  onSaveSavedModule,
  onCreateSavedModule,
  onDeleteSavedModule,
  onSaveSavedSection,
  onDeleteSavedSection
}: BuilderModuleRepositoryListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    modules: true,
    cells: true,
    sections: true
  });
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingModules, setEditingModules] = useState<BuilderTemplateModule[]>([]);
  const [editingExpandedModuleIds, setEditingExpandedModuleIds] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState("");
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSection, setEditingSection] = useState<BuilderTemplateSection | null>(null);
  const [editingSectionCollapsed, setEditingSectionCollapsed] = useState(false);
  const [editingSectionExpandedModuleIds, setEditingSectionExpandedModuleIds] = useState<string[]>([]);
  const [editingSectionGalleryTarget, setEditingSectionGalleryTarget] = useState<
    | { kind: "section-background" }
    | { kind: "module"; moduleId: string }
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const [editingSectionPaletteColumn, setEditingSectionPaletteColumn] = useState("");
  const [activeModuleGroup, setActiveModuleGroup] = useState<ModulePaletteGroup | null>(null);
  const [editingGalleryTarget, setEditingGalleryTarget] = useState<
    | { kind: "module"; moduleId: string }
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);

  function cloneSectionForEditing(section: BuilderTemplateSection): BuilderTemplateSection {
    return {
      ...section,
      background: { ...section.background },
      cellBackgrounds: Object.fromEntries(
        Object.entries(section.cellBackgrounds ?? {}).map(([key, background]) => [key, { ...background }])
      ),
      cellPadding: { ...section.cellPadding },
      cellVerticalMargin: { ...section.cellVerticalMargin },
      cellMobileHidden: { ...section.cellMobileHidden },
      cellDesktopHidden: { ...section.cellDesktopHidden },
      cellBorderWidth: { ...section.cellBorderWidth },
      cellBorderColor: { ...section.cellBorderColor },
      cellBorderRadius: { ...section.cellBorderRadius },
      cellBorderStyle: { ...section.cellBorderStyle },
      cellShadow: { ...section.cellShadow },
      cellOpacity: { ...section.cellOpacity },
      cellHAlign: { ...section.cellHAlign },
      cellVAlign: { ...section.cellVAlign },
      modules: section.modules.map((module) => ({ ...module, settings: { ...module.settings } }))
    };
  }

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function toggleEditingModuleExpanded(moduleId: string) {
    setEditingExpandedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    );
  }

  function startEditing(item: BuilderCellModuleRecord) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingModules(item.modules.map((module) => ({ ...module, settings: { ...module.settings } })));
    setEditingExpandedModuleIds([]);
  }

  function cancelEditing() {
    setEditingId("");
    setEditingName("");
    setEditingModules([]);
    setEditingExpandedModuleIds([]);
  }

  function startEditingSection(sectionRecord: BuilderSavedSectionRecord) {
    setEditingSectionId(sectionRecord.id);
    setEditingSectionName(sectionRecord.name);
    setEditingSection(cloneSectionForEditing(sectionRecord.section));
    setEditingSectionCollapsed(false);
    setEditingSectionExpandedModuleIds([]);
  }

  function cancelEditingSection() {
    setEditingSectionId("");
    setEditingSectionName("");
    setEditingSection(null);
    setEditingSectionCollapsed(false);
    setEditingSectionExpandedModuleIds([]);
    setEditingSectionGalleryTarget(null);
    setEditingSectionPaletteColumn("");
    setActiveModuleGroup(null);
  }

  function updateEditingModule(moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) {
    setEditingModules((current) => current.map((module) => (module.id === moduleId ? updater(module) : module)));
  }

  function selectEditingGalleryImage(imagePath: string) {
    if (!editingGalleryTarget) return;

    if (editingGalleryTarget.kind === "module") {
      updateEditingModule(editingGalleryTarget.moduleId, (module) => ({
        ...module,
        settings: { ...module.settings, url: normalizeBuilderAssetUrl(imagePath) }
      }));
    } else {
      updateEditingModule(editingGalleryTarget.moduleId, (module) => {
        let items: Array<Record<string, unknown>> = [];

        try {
          const parsed = JSON.parse(module.settings.socialItems || "[]");
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }

        return {
          ...module,
          settings: {
            ...module.settings,
            socialItems: JSON.stringify(
              items.map((item, index) => {
                const id = String(item.id || `social-${index + 1}`);
                return id === editingGalleryTarget.itemId
                  ? { ...item, id, iconUrl: normalizeBuilderAssetUrl(imagePath) }
                  : { ...item, id };
              })
            )
          }
        };
      });
    }

    setEditingGalleryTarget(null);
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

  function updateEditingSection(updater: (section: BuilderTemplateSection) => BuilderTemplateSection) {
    setEditingSection((current) => (current ? updater(current) : current));
  }

  function updateEditingSectionModule(
    moduleId: string,
    updater: (current: BuilderTemplateModule) => BuilderTemplateModule
  ) {
    updateEditingSection((section) => ({
      ...section,
      modules: section.modules.map((module) => (module.id === moduleId ? updater(module) : module))
    }));
  }

  function updateEditingSectionModuleBackground(
    moduleId: string,
    updater: (background: BackgroundSettings) => BackgroundSettings
  ) {
    updateEditingSectionModule(moduleId, (module) => {
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

  function toggleEditingSectionModuleExpanded(moduleId: string) {
    setEditingSectionExpandedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    );
  }

  function updateEditingSectionCellBackground(
    column: string,
    updater: (background: BackgroundSettings) => BackgroundSettings
  ) {
    updateEditingSection((section) => ({
      ...section,
      cellBackgrounds: {
        ...section.cellBackgrounds,
        [column]: updater(section.cellBackgrounds[column] ?? createDefaultBackgroundSettings())
      }
    }));
  }

  function updateEditingSectionCellRecord(key: keyof BuilderTemplateSection, column: string, value: string) {
    updateEditingSection((section) => ({
      ...section,
      [key]: {
        ...((section[key] as Record<string, string>) ?? {}),
        [column]: value
      }
    }));
  }

  function cloneModulesForColumn(modules: BuilderTemplateModule[], column: string) {
    return modules.map((module, index) => ({
      ...module,
      id: `${module.type}-${Date.now()}-${index}`,
      column,
      settings: { ...module.settings }
    }));
  }

  function insertEditingSectionCellModule(column: string, cellModuleId: string, moduleCount: 1 | "many") {
    if (!cellModuleId) return;
    const saved = cellModules.find((candidate) =>
      candidate.id === cellModuleId && (moduleCount === 1 ? candidate.modules.length === 1 : candidate.modules.length !== 1)
    );

    if (!saved) return;

    updateEditingSection((section) => ({
      ...section,
      modules: [...section.modules, ...cloneModulesForColumn(saved.modules, column)]
    }));
  }

  function addEditingSectionModuleFromPalette(column: string, item: ModulePaletteItem) {
    const builderModule = createEmptyModule(item.type, column);

    updateEditingSection((section) => ({
      ...section,
      modules: [
        ...section.modules,
        {
          ...builderModule,
          name: item.name,
          text: item.text,
          settings: { ...builderModule.settings, ...item.settings }
        }
      ]
    }));
    setEditingSectionPaletteColumn("");
    setActiveModuleGroup(null);
  }

  function saveEditingSectionCellModules(column: string) {
    if (!editingSection) return;

    const modules = editingSection.modules.filter((module) => module.column === column);
    if (modules.length === 0) return;

    const fallbackName = `${editingSectionName || editingSection.title || "Saved section"} ${column} cell`;
    const name = window.prompt("Name this saved cell module set", fallbackName)?.trim();
    if (!name) return;

    onCreateSavedModule(name, modules);
  }

  function saveEditingSectionModule(moduleId: string) {
    if (!editingSection) return;

    const builderModule = editingSection.modules.find((candidate) => candidate.id === moduleId);
    if (!builderModule) return;

    const fallbackName = builderModule.name || builderModule.type;
    const name = window.prompt("Name this saved module", fallbackName)?.trim();
    if (!name) return;

    onCreateSavedModule(name, [builderModule]);
  }

  function moveEditingSectionModule(moduleId: string, direction: -1 | 1) {
    updateEditingSection((section) => {
      const index = section.modules.findIndex((module) => module.id === moduleId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= section.modules.length) return section;
      const modules = [...section.modules];
      const [moved] = modules.splice(index, 1);
      modules.splice(target, 0, moved);
      return { ...section, modules };
    });
  }

  function dropEditingSectionModule(
    moduleId: string,
    _sourceSectionId: string,
    _targetSectionId: string,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) {
    updateEditingSection((section) => {
      const sourceModule = section.modules.find((module) => module.id === moduleId);
      if (!sourceModule) return section;
      const movedModule = { ...sourceModule, column: targetColumn };
      const remaining = section.modules.filter((module) => module.id !== moduleId);
      const insertAt = targetBeforeModuleId
        ? Math.max(remaining.findIndex((module) => module.id === targetBeforeModuleId), 0)
        : (() => {
            const lastIndexInColumn = Math.max(
              ...remaining.map((module, index) => (module.column === targetColumn ? index : -1)).filter((index) => index >= 0),
              -1
            );
            return lastIndexInColumn >= 0 ? lastIndexInColumn + 1 : remaining.length;
          })();
      const modules = [...remaining];
      modules.splice(insertAt, 0, movedModule);
      return { ...section, modules };
    });
  }

  function removeEditingSectionModule(moduleId: string) {
    setEditingSectionExpandedModuleIds((current) => current.filter((id) => id !== moduleId));
    updateEditingSection((section) => ({
      ...section,
      modules: section.modules.filter((module) => module.id !== moduleId)
    }));
  }

  function cloneEditingSectionModule(moduleId: string) {
    updateEditingSection((section) => {
      const index = section.modules.findIndex((module) => module.id === moduleId);
      if (index < 0) return section;
      const clone = {
        ...section.modules[index],
        id: `${section.modules[index].type}-${Date.now()}`,
        name: section.modules[index].name ? `${section.modules[index].name} (copy)` : "",
        settings: { ...section.modules[index].settings }
      };
      const modules = [...section.modules];
      modules.splice(index + 1, 0, clone);
      return { ...section, modules };
    });
  }

  function selectEditingSectionGalleryImage(imagePath: string) {
    if (!editingSectionGalleryTarget) return;

    if (editingSectionGalleryTarget.kind === "section-background") {
      updateEditingSection((section) => ({
        ...section,
        background: { ...section.background, imageUrl: normalizeBuilderAssetUrl(imagePath), mode: "image" }
      }));
    } else if (editingSectionGalleryTarget.kind === "module") {
      updateEditingSectionModule(editingSectionGalleryTarget.moduleId, (module) => ({
        ...module,
        settings: { ...module.settings, url: normalizeBuilderAssetUrl(imagePath) }
      }));
    } else {
      updateEditingSectionModule(editingSectionGalleryTarget.moduleId, (module) => {
        let items: Array<Record<string, unknown>> = [];

        try {
          const parsed = JSON.parse(module.settings.socialItems || "[]");
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }

        return {
          ...module,
          settings: {
            ...module.settings,
            socialItems: JSON.stringify(
              items.map((item, index) => {
                const id = String(item.id || `social-${index + 1}`);
                return id === editingSectionGalleryTarget.itemId
                  ? { ...item, id, iconUrl: normalizeBuilderAssetUrl(imagePath) }
                  : { ...item, id };
              })
            )
          }
        };
      });
    }

    setEditingSectionGalleryTarget(null);
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
        editingExpandedModuleIds={editingExpandedModuleIds}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("modules")}
        onToggleEditingModuleExpanded={toggleEditingModuleExpanded}
        onOpenEditingModuleGallery={(moduleId) => setEditingGalleryTarget({ kind: "module", moduleId })}
        onOpenEditingSocialIconGallery={(moduleId, itemId) =>
          setEditingGalleryTarget({ kind: "social-icon", moduleId, itemId })
        }
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
        editingExpandedModuleIds={editingExpandedModuleIds}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("cells")}
        onToggleEditingModuleExpanded={toggleEditingModuleExpanded}
        onOpenEditingModuleGallery={(moduleId) => setEditingGalleryTarget({ kind: "module", moduleId })}
        onOpenEditingSocialIconGallery={(moduleId, itemId) =>
          setEditingGalleryTarget({ kind: "social-icon", moduleId, itemId })
        }
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
                  <Fragment key={section.id}>
                    <tr>
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
                            aria-label="Edit saved section"
                            className="polls-icon-button"
                            disabled={isSaving}
                            onClick={() => startEditingSection(section)}
                            title="Edit section"
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
                    {editingSectionId === section.id && editingSection ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="builder-saved-module-editor">
                            <div className="builder-meta-grid">
                              <label className="field">
                                <span>Saved section name</span>
                                <input
                                  type="text"
                                  value={editingSectionName}
                                  onChange={(event) => setEditingSectionName(event.target.value)}
                                />
                              </label>
                              <div className="builder-meta-actions">
                                <button className="secondary-button" onClick={cancelEditingSection} type="button">
                                  Cancel
                                </button>
                                <button
                                  className="submit-button"
                                  disabled={isSaving}
                                  onClick={() => onSaveSavedSection(section.id, editingSectionName, editingSection)}
                                  type="button"
                                >
                                  {isSaving ? "Saving..." : "Save Section"}
                                </button>
                              </div>
                            </div>
                            <BuilderSectionCard
                              cellModules={cellModules}
                              editorDevice="browser"
                              expandedModuleIds={editingSectionExpandedModuleIds}
                              isCollapsed={editingSectionCollapsed}
                              key={editingSection.id}
                              products={products}
                              section={editingSection}
                              sectionIndex={0}
                              onCloneModule={(_, moduleId) => cloneEditingSectionModule(moduleId)}
                              onCloneSection={() => undefined}
                              onDropModule={dropEditingSectionModule}
                              onInsertCellModule={(column, cellModuleId) =>
                                insertEditingSectionCellModule(column, cellModuleId, "many")
                              }
                              onInsertSavedModule={(column, cellModuleId) =>
                                insertEditingSectionCellModule(column, cellModuleId, 1)
                              }
                              onMoveDown={() => undefined}
                              onMoveModule={(moduleId, direction) => moveEditingSectionModule(moduleId, direction)}
                              onMoveUp={() => undefined}
                              onOpenGallery={(moduleId) => setEditingSectionGalleryTarget({ kind: "module", moduleId })}
                              onOpenModulePalette={(column) => setEditingSectionPaletteColumn(column)}
                              onOpenSectionBackgroundGallery={() => setEditingSectionGalleryTarget({ kind: "section-background" })}
                              onOpenSocialIconGallery={(moduleId, itemId) =>
                                setEditingSectionGalleryTarget({ kind: "social-icon", moduleId, itemId })
                              }
                              onRemove={() => undefined}
                              onRemoveModule={removeEditingSectionModule}
                              onSaveCellModules={saveEditingSectionCellModules}
                              onSaveModule={saveEditingSectionModule}
                              onSaveSection={() => onSaveSavedSection(section.id, editingSectionName, editingSection)}
                              onToggleCollapsed={() => setEditingSectionCollapsed((current) => !current)}
                              onToggleModuleExpanded={toggleEditingSectionModuleExpanded}
                              onUpdateCellBackground={updateEditingSectionCellBackground}
                              onUpdateCellBorderColor={(column, value) =>
                                updateEditingSectionCellRecord("cellBorderColor", column, value)
                              }
                              onUpdateCellBorderRadius={(column, value) =>
                                updateEditingSectionCellRecord("cellBorderRadius", column, value)
                              }
                              onUpdateCellBorderWidth={(column, value) =>
                                updateEditingSectionCellRecord("cellBorderWidth", column, value)
                              }
                              onUpdateCellPadding={(column, value) =>
                                updateEditingSectionCellRecord("cellPadding", column, value)
                              }
                              onUpdateModule={updateEditingSectionModule}
                              onUpdateModuleBackground={updateEditingSectionModuleBackground}
                              onUpdateSection={updateEditingSection}
                              onUploadMediaForModule={() => undefined}
                              onUploadSectionBackgroundMedia={() => undefined}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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
      {editingGalleryTarget ? (
        <BuilderGalleryModal
          media={galleryMedia}
          isUploading={isUploadingMedia}
          onSelectImage={selectEditingGalleryImage}
          onClose={() => setEditingGalleryTarget(null)}
        />
      ) : null}
      {editingSectionGalleryTarget ? (
        <BuilderGalleryModal
          media={galleryMedia}
          isUploading={isUploadingMedia}
          onSelectImage={selectEditingSectionGalleryImage}
          onClose={() => setEditingSectionGalleryTarget(null)}
        />
      ) : null}
      {editingSectionPaletteColumn ? (
        <BuilderModulePaletteModal
          activeGroup={activeModuleGroup}
          onClose={() => {
            setEditingSectionPaletteColumn("");
            setActiveModuleGroup(null);
          }}
          onSelectItem={(item) => addEditingSectionModuleFromPalette(editingSectionPaletteColumn, item)}
          onSelectGroup={setActiveModuleGroup}
        />
      ) : null}
    </>
  );
}
