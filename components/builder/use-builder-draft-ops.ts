"use client";

import { type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import type { BuilderDraft } from "./builder-types";
import type { ModulePaletteItem } from "./builder-types";
import type {
  BackgroundSettings,
  BuilderCellModuleRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateLayout,
  BuilderTemplateModule,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { createDefaultBackgroundSettings, createEmptyModule, createEmptySection } from "@/lib/builder-template";
import { getModuleBackgroundSettings } from "./builder-utils";
import { getDefaultEmailTemplateName, type BuilderEmailFunction } from "@/lib/builder-email-template";
import type { BuilderTemplateKind } from "@/lib/builder-template";

export type BuilderPanelKey = "rowConfigurations" | "rows" | "workspace";

type UseBuilderDraftOpsParams = {
  setDraft: Dispatch<SetStateAction<BuilderDraft>>;
  cellModules: BuilderCellModuleRecord[];
  savedSections: BuilderSavedSectionRecord[];
  setCollapsedSectionIds: Dispatch<SetStateAction<string[]>>;
  setExpandedModuleIds: Dispatch<SetStateAction<string[]>>;
  setCollapsedBuilderPanels: Dispatch<SetStateAction<Record<BuilderPanelKey, boolean>>>;
  setSavedSectionSelectKey: Dispatch<SetStateAction<number>>;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

/**
 * Pure draft-document mutations for the builder editor: everything that
 * transforms the in-memory draft (sections, cells, modules, backgrounds)
 * without touching the network. Extracted verbatim from
 * admin-builder-editor.tsx; async persistence stays with the editor.
 */
export function useBuilderDraftOps({
  setDraft,
  cellModules,
  savedSections,
  setCollapsedSectionIds,
  setExpandedModuleIds,
  setCollapsedBuilderPanels,
  setSavedSectionSelectKey,
  setError,
  setMessage
}: UseBuilderDraftOpsParams) {
  function setDraftName(name: string) {
    setDraft((c) => ({ ...c, name }));
  }

  function setTemplateKind(templateKind: BuilderTemplateKind) {
    setDraft((c) => {
      const emailFunction = templateKind === "email" ? c.emailFunction || "signup_confirmation" : "";
      const nextName =
        templateKind === "email" && !c.name.trim()
          ? getDefaultEmailTemplateName(emailFunction)
          : c.name;

      return {
        ...c,
        templateKind,
        emailFunction,
        name: nextName
      };
    });
  }

  function setEmailFunction(emailFunction: BuilderEmailFunction | "") {
    setDraft((c) => ({
      ...c,
      emailFunction,
      name:
        c.templateKind === "email" && !c.name.trim()
          ? getDefaultEmailTemplateName(emailFunction)
          : c.name
    }));
  }

  function toggleBuilderPanel(panel: BuilderPanelKey) {
    setCollapsedBuilderPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  function updatePageBackground(updater: (bg: BackgroundSettings) => BackgroundSettings) {
    setDraft((c) => ({ ...c, pageBackground: updater(c.pageBackground) }));
  }

  function updateSection(sectionId: string, updater: (s: BuilderTemplateSection) => BuilderTemplateSection) {
    setDraft((c) => ({
      ...c,
      layoutSections: c.layoutSections.map((s) => (s.id === sectionId ? updater(s) : s))
    }));
  }

  function updateCellBackground(sectionId: string, column: string, updater: (bg: BackgroundSettings) => BackgroundSettings) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBackgrounds: { ...s.cellBackgrounds, [column]: updater(s.cellBackgrounds[column] ?? createDefaultBackgroundSettings()) }
    }));
  }

  function updateCellPadding(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellPadding: { ...s.cellPadding, [column]: value }
    }));
  }

  function updateCellBorderWidth(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderWidth: { ...s.cellBorderWidth, [column]: value }
    }));
  }

  function updateCellBorderColor(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderColor: { ...s.cellBorderColor, [column]: value }
    }));
  }

  function updateCellBorderRadius(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderRadius: { ...s.cellBorderRadius, [column]: value }
    }));
  }

  function updateModule(sectionId: string, moduleId: string, updater: (m: BuilderTemplateModule) => BuilderTemplateModule) {
    updateSection(sectionId, (s) => ({
      ...s,
      modules: s.modules.map((m) => (m.id === moduleId ? updater(m) : m))
    }));
  }

  function updateModuleBackground(sectionId: string, moduleId: string, updater: (bg: BackgroundSettings) => BackgroundSettings) {
    updateModule(sectionId, moduleId, (current) => {
      const next = updater(getModuleBackgroundSettings(current.settings));
      const isClear = next.mode === "none";

      return {
        ...current,
        settings: {
          ...current.settings,
          backgroundMode: next.mode,
          backgroundColor: isClear ? "" : next.color,
          backgroundColor2: isClear ? "" : next.color2,
          backgroundImageUrl: isClear ? "" : next.imageUrl,
          backgroundStyleKey: isClear ? "" : next.styleKey
        }
      };
    });
  }

  function addSection(layout: BuilderTemplateLayout) {
    const newSection = createEmptySection(layout);
    setDraft((c) => ({ ...c, layoutSections: [...c.layoutSections, newSection] }));
    setCollapsedSectionIds((c) => [...c, newSection.id]);
  }

  function removeSection(sectionId: string) {
    setDraft((c) => ({ ...c, layoutSections: c.layoutSections.filter((s) => s.id !== sectionId) }));
  }

  function cloneSection(sectionId: string) {
    setDraft((c) => {
      const idx = c.layoutSections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return c;
      const source = c.layoutSections[idx];
      const cloned = {
        ...source,
        id: crypto.randomUUID(),
        modules: source.modules.map((m) => ({ ...m, id: crypto.randomUUID() }))
      };
      const arr = [...c.layoutSections];
      arr.splice(idx + 1, 0, cloned);
      return { ...c, layoutSections: arr };
    });
  }

  function cloneSavedSection(source: BuilderTemplateSection): BuilderTemplateSection {
    return {
      ...source,
      id: crypto.randomUUID(),
      modules: source.modules.map((module) => ({
        ...module,
        id: crypto.randomUUID(),
        settings: { ...module.settings }
      }))
    };
  }

  function insertSavedSection(savedSectionId: string) {
    if (!savedSectionId) return;

    const savedSection = savedSections.find((candidate) => candidate.id === savedSectionId);
    if (!savedSection) return;

    const section = cloneSavedSection(savedSection.section);
    setDraft((current) => ({ ...current, layoutSections: [...current.layoutSections, section] }));
    setCollapsedSectionIds((current) => [...current, section.id]);
    setMessage(`Inserted saved section "${savedSection.name}".`);
    setError(null);
    setSavedSectionSelectKey((current) => current + 1);
  }

  function handleSavedSectionSelect(event: ChangeEvent<HTMLSelectElement>) {
    insertSavedSection(event.target.value);
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setDraft((c) => {
      const idx = c.layoutSections.findIndex((s) => s.id === sectionId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= c.layoutSections.length) return c;
      const arr = [...c.layoutSections];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return { ...c, layoutSections: arr };
    });
  }

  function toggleSectionCollapsed(sectionId: string) {
    setCollapsedSectionIds((c) =>
      c.includes(sectionId) ? c.filter((id) => id !== sectionId) : [...c, sectionId]
    );
  }

  function addModuleFromPalette(sectionId: string, column: string, item: ModulePaletteItem) {
    const mod = createEmptyModule(item.type, column);
    updateSection(sectionId, (s) => ({
      ...s,
      modules: [...s.modules, { ...mod, name: item.name, text: item.text, settings: { ...mod.settings, ...item.settings } }]
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

  function promptForModuleClass(fallbackClass = "") {
    const moduleClass = window.prompt("Module class (Navigation, Headings, etc.)", fallbackClass)?.trim();
    return moduleClass ?? null;
  }

  function insertCellModule(sectionId: string, column: string, cellModuleId: string) {
    if (!cellModuleId) {
      return;
    }

    const saved = cellModules.find((candidate) => candidate.id === cellModuleId && candidate.modules.length !== 1);

    if (!saved) {
      return;
    }

    updateSection(sectionId, (section) => ({
      ...section,
      modules: [...section.modules, ...cloneModulesForColumn(saved.modules, column)]
    }));
    setMessage(`Inserted "${saved.name}" into the ${column} cell.`);
    setError(null);
  }

  function insertSavedModule(sectionId: string, column: string, cellModuleId: string) {
    if (!cellModuleId) {
      return;
    }

    const saved = cellModules.find((candidate) => candidate.id === cellModuleId && candidate.modules.length === 1);

    if (!saved) {
      return;
    }

    updateSection(sectionId, (section) => ({
      ...section,
      modules: [...section.modules, ...cloneModulesForColumn(saved.modules, column)]
    }));
    setMessage(`Inserted module "${saved.name}" into the ${column} cell.`);
    setError(null);
  }

  function moveModule(sectionId: string, moduleId: string, direction: -1 | 1) {
    updateSection(sectionId, (s) => {
      const idx = s.modules.findIndex((m) => m.id === moduleId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= s.modules.length) return s;
      const arr = [...s.modules];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return { ...s, modules: arr };
    });
  }

  function dropModule(
    moduleId: string,
    sourceSectionId: string,
    targetSectionId: string,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) {
    setDraft((current) => {
      const sourceSection = current.layoutSections.find((section) => section.id === sourceSectionId);
      const targetSection = current.layoutSections.find((section) => section.id === targetSectionId);

      if (!sourceSection || !targetSection) return current;

      const sourceModule = sourceSection.modules.find((module) => module.id === moduleId);
      if (!sourceModule) return current;

      const movedModule: BuilderTemplateModule = { ...sourceModule, column: targetColumn };

      return {
        ...current,
        layoutSections: current.layoutSections.map((section) => {
          if (section.id !== sourceSectionId && section.id !== targetSectionId) return section;

          if (sourceSectionId === targetSectionId && section.id === sourceSectionId) {
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
            const nextModules = [...remaining];
            nextModules.splice(insertAt, 0, movedModule);
            return { ...section, modules: nextModules };
          }

          if (section.id === sourceSectionId) {
            return { ...section, modules: section.modules.filter((module) => module.id !== moduleId) };
          }

          const insertAt = targetBeforeModuleId
            ? Math.max(section.modules.findIndex((module) => module.id === targetBeforeModuleId), 0)
            : (() => {
                const lastIndexInColumn = Math.max(
                  ...section.modules.map((module, index) => (module.column === targetColumn ? index : -1)).filter((index) => index >= 0),
                  -1
                );
                return lastIndexInColumn >= 0 ? lastIndexInColumn + 1 : section.modules.length;
              })();

          const nextModules = [...section.modules];
          nextModules.splice(insertAt, 0, movedModule);
          return { ...section, modules: nextModules };
        })
      };
    });
  }

  function cloneModule(sectionId: string, moduleId: string) {
    updateSection(sectionId, (s) => {
      const index = s.modules.findIndex((m) => m.id === moduleId);
      if (index < 0) return s;
      const original = s.modules[index];
      const clone = {
        ...original,
        id: `${original.type}-${Date.now()}`,
        name: original.name ? `${original.name} (copy)` : "",
        settings: { ...original.settings }
      };
      const nextModules = [...s.modules];
      nextModules.splice(index + 1, 0, clone);
      return { ...s, modules: nextModules };
    });
  }

  function removeModule(sectionId: string, moduleId: string) {
    setExpandedModuleIds((c) => c.filter((id) => id !== moduleId));
    updateSection(sectionId, (s) => ({ ...s, modules: s.modules.filter((m) => m.id !== moduleId) }));
  }

  function toggleModuleExpanded(moduleId: string) {
    setExpandedModuleIds((c) =>
      c.includes(moduleId) ? c.filter((id) => id !== moduleId) : [...c, moduleId]
    );
  }


  return {
    setDraftName,
    setTemplateKind,
    setEmailFunction,
    toggleBuilderPanel,
    updatePageBackground,
    updateSection,
    updateCellBackground,
    updateCellPadding,
    updateCellBorderWidth,
    updateCellBorderColor,
    updateCellBorderRadius,
    updateModule,
    updateModuleBackground,
    addSection,
    removeSection,
    cloneSection,
    cloneSavedSection,
    insertSavedSection,
    handleSavedSectionSelect,
    moveSection,
    toggleSectionCollapsed,
    addModuleFromPalette,
    cloneModulesForColumn,
    promptForModuleClass,
    insertCellModule,
    insertSavedModule,
    moveModule,
    dropModule,
    cloneModule,
    removeModule,
    toggleModuleExpanded
  };
}
