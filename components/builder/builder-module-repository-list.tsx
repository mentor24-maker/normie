
import type { BackgroundSettings, BuilderCellModuleRecord, BuilderSavedSectionRecord, BuilderTemplateModule, BuilderTemplateSection } from "@/lib/builder-template";
import { repositoryEditingSessionKeyFromFocus } from "@/lib/builder-repository-save-session";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createDefaultBackgroundSettings, createEmptyModule, normalizeBuilderAssetUrl } from "@/lib/builder-template";

import { BuilderGalleryModal } from "./builder-gallery-modal";

import { BuilderModulePaletteModal, type ModulePaletteAnchor } from "./builder-module-palette-modal";

import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";
import { appendRichTextImageToHtml } from "@/lib/rich-text-image";

import { BUILDER_MODULE_CLASS_OPTIONS, inferModuleClassFromBuilderModules, resolveModuleClassForBuilderModule } from "@/lib/module-class-triggers";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";
import { CreatedModulesTable } from "./builder-created-modules-table";
import { BuilderModuleEditorFocus, BuilderModuleRepositoryListProps, CreatedModuleRecord, getCreatedModules, getDisplayModuleClass } from "./builder-repository-helpers";
import { RepositoryTable } from "./builder-repository-table";
import { SavedSectionsTable } from "./builder-saved-sections-table";

export type { BuilderModuleEditorFocus, CreatedModuleSource } from "./builder-repository-helpers";

export function BuilderModuleRepositoryList({
  cellModules,
  pages,
  products,
  galleryMedia,
  savedSections,
  templates,
  isSaving,
  onSaveCreatedModule,
  onCloneCreatedModule,
  onDeleteCreatedModule,
  onSaveSavedModule,
  onCreateSavedModule,
  onCloneSavedModule,
  onDeleteSavedModule,
  onSaveSavedSection,
  onDeleteSavedSection,
  onModuleEditorFocusChange,
  onRepositoryEditingActiveChange
}: BuilderModuleRepositoryListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    createdModules: true,
    modules: true,
    cells: true,
    sections: true
  });
  const [editingCreatedId, setEditingCreatedId] = useState("");
  const [editingCreatedModule, setEditingCreatedModule] = useState<BuilderTemplateModule | null>(null);
  const [editingCreatedExpanded, setEditingCreatedExpanded] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingModuleClass, setEditingModuleClass] = useState("");
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
    | { kind: "rich-text"; moduleId: string }
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const [editingSectionPaletteColumn, setEditingSectionPaletteColumn] = useState("");
  const [editingSectionPaletteAnchor, setEditingSectionPaletteAnchor] = useState<ModulePaletteAnchor | null>(null);
  const [activeModuleGroup, setActiveModuleGroup] = useState<ModulePaletteGroup | null>(null);
  const [editingGalleryTarget, setEditingGalleryTarget] = useState<
    | { kind: "created-module" }
    | { kind: "created-rich-text" }
    | { kind: "created-social-icon"; itemId: string }
    | { kind: "module"; moduleId: string }
    | { kind: "rich-text"; moduleId: string }
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const [editingGalleryAnchor, setEditingGalleryAnchor] = useState<BuilderModalAnchor | null>(null);
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);
  const createdModules = useMemo(() => getCreatedModules(templates, pages), [pages, templates]);

  function buildCreatedModuleFocus(): BuilderModuleEditorFocus | null {
    if (!editingCreatedId || !editingCreatedModule) {
      return null;
    }

    const source = createdModules.find((item) => item.id === editingCreatedId);

    if (!source) {
      return null;
    }

    return {
      kind: "created",
      source: {
        kind: source.kind,
        sourceId: source.sourceId,
        sectionId: source.sectionId,
        moduleId: source.moduleId
      },
      module: editingCreatedModule
    };
  }

  function buildSavedModuleFocus(): BuilderModuleEditorFocus | null {
    if (!editingId) {
      return null;
    }

    return {
      kind: "saved",
      cellModuleId: editingId,
      name: editingName,
      moduleClass: editingModuleClass,
      modules: editingModules
    };
  }

  function buildSectionFocus(): BuilderModuleEditorFocus | null {
    if (!editingSectionId || !editingSection) {
      return null;
    }

    return {
      kind: "section",
      sectionId: editingSectionId,
      name: editingSectionName,
      section: editingSection
    };
  }

  const lastPublishedEditingSessionKeyRef = useRef("");

  function publishRepositorySaveFocus(focus: BuilderModuleEditorFocus | null) {
    lastPublishedEditingSessionKeyRef.current = focus
      ? repositoryEditingSessionKeyFromFocus(focus)
      : "";

    onModuleEditorFocusChange(focus, false);
  }

  function syncRepositorySaveFocus() {
    const focus =
      buildSectionFocus() ?? buildCreatedModuleFocus() ?? buildSavedModuleFocus();

    if (!focus) {
      return;
    }

    onModuleEditorFocusChange(focus, true);
  }

  const editingSessionKey = useMemo(() => {
    const focus =
      buildSectionFocus() ?? buildCreatedModuleFocus() ?? buildSavedModuleFocus();

    return focus ? repositoryEditingSessionKeyFromFocus(focus) : "";
  }, [
    createdModules,
    editingCreatedId,
    editingCreatedModule,
    editingId,
    editingModuleClass,
    editingModules,
    editingName,
    editingSection,
    editingSectionId,
    editingSectionName
  ]);

  const repositoryEditorOpen = Boolean(editingCreatedId || editingId || editingSectionId);

  useEffect(() => {
    onRepositoryEditingActiveChange(repositoryEditorOpen);
  }, [onRepositoryEditingActiveChange, repositoryEditorOpen]);

  useEffect(() => {
    if (!editingSessionKey) {
      if (lastPublishedEditingSessionKeyRef.current) {
        publishRepositorySaveFocus(null);
      }
      return;
    }

    const focus =
      buildSectionFocus() ?? buildCreatedModuleFocus() ?? buildSavedModuleFocus();

    if (!focus) {
      return;
    }

    if (lastPublishedEditingSessionKeyRef.current === editingSessionKey) {
      syncRepositorySaveFocus();
      return;
    }

    lastPublishedEditingSessionKeyRef.current = editingSessionKey;
    publishRepositorySaveFocus(focus);
  }, [
    createdModules,
    editingCreatedId,
    editingCreatedModule,
    editingId,
    editingModuleClass,
    editingModules,
    editingName,
    editingSection,
    editingSectionId,
    editingSectionName,
    editingSessionKey,
    onModuleEditorFocusChange
  ]);

  function resetSavedModuleAndCellEditing() {
    setEditingId("");
    setEditingName("");
    setEditingModuleClass("");
    setEditingModules([]);
    setEditingExpandedModuleIds([]);
  }

  function resetCreatedModuleEditing() {
    setEditingCreatedId("");
    setEditingCreatedModule(null);
    setEditingCreatedExpanded(false);
  }

  function resetSectionEditing() {
    setEditingSectionId("");
    setEditingSectionName("");
    setEditingSection(null);
    setEditingSectionCollapsed(false);
    setEditingSectionExpandedModuleIds([]);
    setEditingSectionGalleryTarget(null);
    setEditingSectionPaletteColumn("");
    setEditingSectionPaletteAnchor(null);
  }

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
    resetCreatedModuleEditing();
    resetSectionEditing();

    const modules = item.modules.map((module) => ({ ...module, settings: { ...module.settings } }));
    const expandedIds = modules.length > 0 ? [modules[0].id] : [];

    setEditingId(item.id);
    setEditingName(item.name);
    setEditingModuleClass(getDisplayModuleClass(item));
    setEditingModules(modules);
    setEditingExpandedModuleIds(expandedIds);
    publishRepositorySaveFocus({
      kind: "saved",
      cellModuleId: item.id,
      name: item.name,
      moduleClass: getDisplayModuleClass(item),
      modules
    });
  }

  function startEditingCreatedModule(item: CreatedModuleRecord) {
    resetSavedModuleAndCellEditing();
    resetSectionEditing();

    setEditingCreatedId(item.id);
    setEditingCreatedModule({ ...item.module, settings: { ...item.module.settings } });
    setEditingCreatedExpanded(true);
    publishRepositorySaveFocus({
      kind: "created",
      source: {
        kind: item.kind,
        sourceId: item.sourceId,
        sectionId: item.sectionId,
        moduleId: item.moduleId
      },
      module: { ...item.module, settings: { ...item.module.settings } }
    });
  }

  function cancelEditingCreatedModule() {
    resetCreatedModuleEditing();
    publishRepositorySaveFocus(null);
  }

  function cancelEditing() {
    resetSavedModuleAndCellEditing();
    publishRepositorySaveFocus(null);
  }

  function startEditingSection(sectionRecord: BuilderSavedSectionRecord) {
    resetCreatedModuleEditing();
    resetSavedModuleAndCellEditing();

    const section = cloneSectionForEditing(sectionRecord.section);

    setEditingSectionId(sectionRecord.id);
    setEditingSectionName(sectionRecord.name);
    setEditingSection(section);
    setEditingSectionCollapsed(false);
    setEditingSectionExpandedModuleIds([]);
    publishRepositorySaveFocus({
      kind: "section",
      sectionId: sectionRecord.id,
      name: sectionRecord.name,
      section
    });
  }

  function cancelEditingSection() {
    resetSectionEditing();
    publishRepositorySaveFocus(null);
    setEditingSectionPaletteColumn("");
    setActiveModuleGroup(null);
  }

  function updateEditingModule(moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) {
    setEditingModules((current) => current.map((module) => (module.id === moduleId ? updater(module) : module)));
  }

  function updateEditingCreatedModule(updater: (current: BuilderTemplateModule) => BuilderTemplateModule) {
    setEditingCreatedModule((current) => (current ? updater(current) : current));
  }

  function selectEditingGalleryImage(imagePath: string) {
    if (!editingGalleryTarget) return;

    if (editingGalleryTarget.kind === "created-rich-text") {
      updateEditingCreatedModule((module) => ({
        ...module,
        text: appendRichTextImageToHtml(module.text, normalizeBuilderAssetUrl(imagePath))
      }));
      setEditingGalleryTarget(null);
      setEditingGalleryAnchor(null);
      return;
    }

    if (editingGalleryTarget.kind === "rich-text") {
      updateEditingModule(editingGalleryTarget.moduleId, (module) => ({
        ...module,
        text: appendRichTextImageToHtml(module.text, normalizeBuilderAssetUrl(imagePath))
      }));
      setEditingGalleryTarget(null);
      setEditingGalleryAnchor(null);
      return;
    }

    if (editingGalleryTarget.kind === "created-module") {
      updateEditingCreatedModule((module) => ({
        ...module,
        settings: { ...module.settings, url: normalizeBuilderAssetUrl(imagePath) }
      }));
    } else if (editingGalleryTarget.kind === "created-social-icon") {
      updateEditingCreatedModule((module) => {
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
    } else if (editingGalleryTarget.kind === "module") {
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

  function updateEditingCreatedModuleBackground(updater: (background: BackgroundSettings) => BackgroundSettings) {
    updateEditingCreatedModule((module) => {
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

    const moduleClass = window.prompt("Module class (Navigation, Headings, etc.)", "Layout")?.trim();
    if (moduleClass === undefined) return;

    onCreateSavedModule(name, moduleClass, modules);
  }

  function saveEditingSectionModule(moduleId: string) {
    if (!editingSection) {
      return;
    }

    const builderModule = editingSection.modules.find((module) => module.id === moduleId);
    if (!builderModule) {
      return;
    }

    const fallbackName = builderModule.name || builderModule.type;
    const name = window.prompt("Name this saved module", fallbackName)?.trim();
    if (!name) {
      return;
    }

    const moduleClass = window
      .prompt(
        "Module class (Navigation, Headings, etc.)",
        resolveModuleClassForBuilderModule(builderModule) || inferModuleClassFromBuilderModules([builderModule])
      )
      ?.trim();

    if (moduleClass === undefined) {
      return;
    }

    onCreateSavedModule(name, moduleClass, [builderModule]);
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

    if (editingSectionGalleryTarget.kind === "rich-text") {
      updateEditingSectionModule(editingSectionGalleryTarget.moduleId, (module) => ({
        ...module,
        text: appendRichTextImageToHtml(module.text, normalizeBuilderAssetUrl(imagePath))
      }));
      setEditingSectionGalleryTarget(null);
      setEditingGalleryAnchor(null);
      return;
    }

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
      <datalist id="builder-module-class-options">
        {BUILDER_MODULE_CLASS_OPTIONS.map((moduleClass) => (
          <option key={moduleClass} value={moduleClass} />
        ))}
      </datalist>
      <div className="builder-modules-repository">
      <CreatedModulesTable
        emptyLabel="No modules on pages or templates yet. Add one from Pages → Module Library (for example Speech Bubble)."
        editingCreatedExpanded={editingCreatedExpanded}
        editingCreatedId={editingCreatedId}
        editingCreatedModule={editingCreatedModule}
        isCollapsed={collapsedPanels.createdModules}
        isSaving={isSaving}
        items={createdModules}
        products={products}
        onCancelEditing={cancelEditingCreatedModule}
        onCloneCreatedModule={onCloneCreatedModule}
        onDeleteCreatedModule={onDeleteCreatedModule}
        onOpenEditingCreatedModuleGallery={() => setEditingGalleryTarget({ kind: "created-module" })}
        onOpenEditingCreatedRichTextGallery={(anchor) => {
          setEditingGalleryAnchor(anchor ?? null);
          setEditingGalleryTarget({ kind: "created-rich-text" });
        }}
        onOpenEditingCreatedSocialIconGallery={(itemId) => setEditingGalleryTarget({ kind: "created-social-icon", itemId })}
        onSaveCreatedModule={onSaveCreatedModule}
        onStartEditing={startEditingCreatedModule}
        onToggle={() => togglePanel("createdModules")}
        onToggleEditingCreatedExpanded={() => setEditingCreatedExpanded((current) => !current)}
        onUpdateEditingCreatedModule={updateEditingCreatedModule}
        onUpdateEditingCreatedModuleBackground={updateEditingCreatedModuleBackground}
      />
      <RepositoryTable
        emptyLabel="No saved modules found."
        isCollapsed={collapsedPanels.modules}
        isSaving={isSaving}
        items={savedModules}
        products={products}
        editingId={editingId}
        editingName={editingName}
        editingModuleClass={editingModuleClass}
        editingExpandedModuleIds={editingExpandedModuleIds}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCloneSavedModule={onCloneSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onSetEditingModuleClass={setEditingModuleClass}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("modules")}
        onToggleEditingModuleExpanded={toggleEditingModuleExpanded}
        onOpenEditingModuleGallery={(moduleId) => setEditingGalleryTarget({ kind: "module", moduleId })}
        onOpenEditingRichTextGallery={(moduleId, anchor) => {
          setEditingGalleryAnchor(anchor ?? null);
          setEditingGalleryTarget({ kind: "rich-text", moduleId });
        }}
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
        editingModuleClass={editingModuleClass}
        editingExpandedModuleIds={editingExpandedModuleIds}
        editingModules={editingModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onCloneSavedModule={onCloneSavedModule}
        onCancelEditing={cancelEditing}
        onSaveSavedModule={onSaveSavedModule}
        onSetEditingName={setEditingName}
        onSetEditingModuleClass={setEditingModuleClass}
        onStartEditing={startEditing}
        onToggle={() => togglePanel("cells")}
        onToggleEditingModuleExpanded={toggleEditingModuleExpanded}
        onOpenEditingModuleGallery={(moduleId) => setEditingGalleryTarget({ kind: "module", moduleId })}
        onOpenEditingRichTextGallery={(moduleId, anchor) => {
          setEditingGalleryAnchor(anchor ?? null);
          setEditingGalleryTarget({ kind: "rich-text", moduleId });
        }}
        onOpenEditingSocialIconGallery={(moduleId, itemId) =>
          setEditingGalleryTarget({ kind: "social-icon", moduleId, itemId })
        }
        onUpdateEditingModule={updateEditingModule}
        onUpdateEditingModuleBackground={updateEditingModuleBackground}
        title="Saved Cells"
      />
      <SavedSectionsTable
        cellModules={cellModules}
        editingSection={editingSection}
        editingSectionCollapsed={editingSectionCollapsed}
        editingSectionExpandedModuleIds={editingSectionExpandedModuleIds}
        editingSectionId={editingSectionId}
        editingSectionName={editingSectionName}
        isCollapsed={collapsedPanels.sections}
        isSaving={isSaving}
        products={products}
        savedSections={savedSections}
        onCancelEditingSection={cancelEditingSection}
        onCloneEditingSectionModule={cloneEditingSectionModule}
        onDeleteSavedSection={onDeleteSavedSection}
        onDropEditingSectionModule={dropEditingSectionModule}
        onInsertEditingSectionCellModule={insertEditingSectionCellModule}
        onMoveEditingSectionModule={moveEditingSectionModule}
        onOpenEditingSectionBackgroundGallery={() => setEditingSectionGalleryTarget({ kind: "section-background" })}
        onOpenEditingSectionModuleGallery={(moduleId) => setEditingSectionGalleryTarget({ kind: "module", moduleId })}
        onOpenEditingSectionRichTextGallery={(moduleId, anchor) => {
          setEditingGalleryAnchor(anchor ?? null);
          setEditingSectionGalleryTarget({ kind: "rich-text", moduleId });
        }}
        onOpenEditingSectionModulePalette={(column, anchor) => {
          setEditingSectionPaletteColumn(column);
          setEditingSectionPaletteAnchor(anchor ?? null);
        }}
        onOpenEditingSectionSocialIconGallery={(moduleId, itemId) =>
          setEditingSectionGalleryTarget({ kind: "social-icon", moduleId, itemId })
        }
        onRemoveEditingSectionModule={removeEditingSectionModule}
        onSaveEditingSectionCellModules={saveEditingSectionCellModules}
        onSaveEditingSectionModule={saveEditingSectionModule}
        onSaveSavedSection={onSaveSavedSection}
        onSetEditingSectionName={setEditingSectionName}
        onStartEditingSection={startEditingSection}
        onToggle={() => togglePanel("sections")}
        onToggleEditingSectionCollapsed={() => setEditingSectionCollapsed((current) => !current)}
        onToggleEditingSectionModuleExpanded={toggleEditingSectionModuleExpanded}
        onUpdateEditingSection={updateEditingSection}
        onUpdateEditingSectionCellBackground={updateEditingSectionCellBackground}
        onUpdateEditingSectionCellRecord={updateEditingSectionCellRecord}
        onUpdateEditingSectionModule={updateEditingSectionModule}
        onUpdateEditingSectionModuleBackground={updateEditingSectionModuleBackground}
      />
      </div>
      {editingGalleryTarget ? (
        <BuilderGalleryModal
          anchor={
            editingGalleryTarget.kind === "rich-text" || editingGalleryTarget.kind === "created-rich-text"
              ? editingGalleryAnchor
              : null
          }
          onSelectImage={selectEditingGalleryImage}
          onClose={() => {
            setEditingGalleryTarget(null);
            setEditingGalleryAnchor(null);
          }}
        />
      ) : null}
      {editingSectionGalleryTarget ? (
        <BuilderGalleryModal
          anchor={editingSectionGalleryTarget.kind === "rich-text" ? editingGalleryAnchor : null}
          onSelectImage={selectEditingSectionGalleryImage}
          onClose={() => {
            setEditingSectionGalleryTarget(null);
            setEditingGalleryAnchor(null);
          }}
        />
      ) : null}
      {editingSectionPaletteColumn ? (
        <BuilderModulePaletteModal
          activeGroup={activeModuleGroup}
          anchor={editingSectionPaletteAnchor}
          cellModules={cellModules}
          onClose={() => {
            setEditingSectionPaletteColumn("");
            setEditingSectionPaletteAnchor(null);
            setActiveModuleGroup(null);
          }}
          onSelectItem={(item) => addEditingSectionModuleFromPalette(editingSectionPaletteColumn, item)}
          onSelectSavedModule={(cellModuleId) => {
            insertEditingSectionCellModule(editingSectionPaletteColumn, cellModuleId, 1);
            setEditingSectionPaletteColumn("");
            setActiveModuleGroup(null);
          }}
          onSelectGroup={setActiveModuleGroup}
        />
      ) : null}
    </>
  );
}
