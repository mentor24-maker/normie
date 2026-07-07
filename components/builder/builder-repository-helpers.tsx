import type { AdminMediaItem } from "@/lib/admin-media";
import type { BuilderCellModuleRecord, BuilderPageRecord, BuilderProductRecord, BuilderSavedSectionRecord, BuilderTemplateRecord, BuilderTemplateModule, BuilderTemplateSection } from "@/lib/builder-template";

import { formatTemplateTimestamp } from "./builder-utils";
import { layoutOptions, modulePaletteGroups } from "./builder-types";
import { BUILDER_MODULE_CLASS_OPTIONS, getBuilderModuleClassOptions, inferModuleClassFromBuilderModules, resolveModuleClassForBuilderModule, resolveSavedModuleClass } from "@/lib/module-class-triggers";
import type { ModulePaletteGroup } from "./builder-types";

export function getModuleClassOptions(currentValue: string) {
  return getBuilderModuleClassOptions(currentValue);
}

export type BuilderModuleRepositoryListProps = {
  cellModules: BuilderCellModuleRecord[];
  pages: BuilderPageRecord[];
  products: BuilderProductRecord[];
  galleryMedia: AdminMediaItem[];
  isUploadingMedia: boolean;
  savedSections: BuilderSavedSectionRecord[];
  templates: BuilderTemplateRecord[];
  isSaving: boolean;
  onSaveCreatedModule: (source: CreatedModuleSource, module: BuilderTemplateModule) => void;
  onCloneCreatedModule: (module: BuilderTemplateModule, moduleLabel: string) => void;
  onDeleteCreatedModule: (source: CreatedModuleSource, moduleName: string) => void;
  onSaveSavedModule: (cellModuleId: string, name: string, moduleClass: string, modules: BuilderTemplateModule[]) => void;
  onCreateSavedModule: (name: string, moduleClass: string, modules: BuilderTemplateModule[]) => void;
  onCloneSavedModule: (cellModuleId: string) => void;
  onDeleteSavedModule: (cellModuleId: string, currentName: string) => void;
  onSaveSavedSection: (sectionId: string, name: string, section: BuilderTemplateSection) => void;
  onDeleteSavedSection: (sectionId: string, currentName: string) => void;
  onModuleEditorFocusChange: (focus: BuilderModuleEditorFocus | null, syncOnly?: boolean) => void;
  onRepositoryEditingActiveChange: (active: boolean) => void;
};

export type CreatedModuleSource = {
  kind: "template" | "page";
  sourceId: string;
  sectionId: string;
  moduleId: string;
};

export type BuilderModuleEditorFocus =
  | {
      kind: "created";
      source: CreatedModuleSource;
      module: BuilderTemplateModule;
    }
  | {
      kind: "saved";
      cellModuleId: string;
      name: string;
      moduleClass: string;
      modules: BuilderTemplateModule[];
    }
  | {
      kind: "section";
      sectionId: string;
      name: string;
      section: BuilderTemplateSection;
    };

export type CreatedModuleRecord = CreatedModuleSource & {
  id: string;
  module: BuilderTemplateModule;
  sourceName: string;
  sectionTitle: string;
  updatedAt: string;
};

export function getModuleSummary(cellModule: BuilderCellModuleRecord) {
  if (cellModule.modules.length === 1) {
    return cellModule.modules[0]?.type || "module";
  }

  return `${cellModule.modules.length} modules`;
}

export function getInferredModuleClass(modules: BuilderTemplateModule[]) {
  return inferModuleClassFromBuilderModules(modules);
}

export function getDisplayModuleClassForModule(module: BuilderTemplateModule) {
  return resolveModuleClassForBuilderModule(module) || "Unclassified";
}

export function getDisplayModuleClass(cellModule: BuilderCellModuleRecord) {
  return resolveSavedModuleClass(cellModule.moduleClass, cellModule.modules) || "Unclassified";
}

export function stripRichTextPreview(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const MODULE_TYPE_LABELS = new Map(modulePaletteGroups.map((group) => [group.value, group.label]));

export function formatBuilderModuleTypeLabel(type: string): string {
  const normalized = type.trim().toLowerCase();

  if (MODULE_TYPE_LABELS.has(normalized as ModulePaletteGroup)) {
    return MODULE_TYPE_LABELS.get(normalized as ModulePaletteGroup) ?? type;
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSectionTitle(sectionTitle: string): string {
  const trimmed = sectionTitle.trim();

  if (!trimmed) {
    return "Untitled Section";
  }

  return layoutOptions.find((option) => option.value === trimmed)?.label ?? trimmed;
}

export function CrudTruncateCell({ text, title }: { text: string; title?: string }) {
  const resolvedTitle = title ?? text;

  return (
    <span className="builder-crud-truncate" title={resolvedTitle}>
      {text}
    </span>
  );
}

export function getModuleLabel(module: BuilderTemplateModule) {
  const name = module.name?.trim();

  if (name) {
    return name;
  }

  const settingsLabel = module.settings.label?.trim();

  if (settingsLabel) {
    return settingsLabel;
  }

  const textPreview = stripRichTextPreview(module.text || "");

  if (textPreview) {
    return textPreview;
  }

  return formatBuilderModuleTypeLabel(module.type);
}

export function getCreatedModuleSourceLabel(item: CreatedModuleRecord) {
  const kindLabel = item.kind === "template" ? "Template" : "Page";
  const sourceName = item.sourceName?.trim() || "Untitled";

  return `${kindLabel}: ${sourceName}`;
}

export type CreatedModuleFilters = {
  module: string;
  type: string;
  section: string;
  className: string;
  updated: string;
};

export const EMPTY_CREATED_MODULE_FILTERS: CreatedModuleFilters = {
  module: "",
  type: "",
  section: "",
  className: "",
  updated: ""
};

export function getCreatedModuleFilterOptions(items: CreatedModuleRecord[]) {
  const types = new Set<string>();
  const sections = new Set<string>();

  for (const item of items) {
    types.add(formatBuilderModuleTypeLabel(item.module.type));
    sections.add(formatSectionTitle(item.sectionTitle));
  }

  return {
    types: [...types].sort((a, b) => a.localeCompare(b)),
    classes: BUILDER_MODULE_CLASS_OPTIONS,
    sections: [...sections].sort((a, b) => a.localeCompare(b))
  };
}

export function matchesCreatedModuleFilters(item: CreatedModuleRecord, filters: CreatedModuleFilters) {
  const moduleLabel = getModuleLabel(item.module);
  const moduleTypeLabel = formatBuilderModuleTypeLabel(item.module.type);
  const sectionLabel = formatSectionTitle(item.sectionTitle);
  const moduleClassLabel = getDisplayModuleClassForModule(item.module);
  const moduleQuery = filters.module.trim().toLowerCase();
  const updatedQuery = filters.updated.trim().toLowerCase();
  const updatedLabel = formatTemplateTimestamp(item.updatedAt).toLowerCase();

  if (moduleQuery && !moduleLabel.toLowerCase().includes(moduleQuery)) {
    return false;
  }

  if (filters.type && moduleTypeLabel !== filters.type) {
    return false;
  }

  if (filters.section && sectionLabel !== filters.section) {
    return false;
  }

  if (filters.className && moduleClassLabel !== filters.className) {
    return false;
  }

  if (updatedQuery && !updatedLabel.includes(updatedQuery) && !item.updatedAt.toLowerCase().includes(updatedQuery)) {
    return false;
  }

  return true;
}

export type CreatedModuleSortKey = "module" | "type" | "section" | "moduleClass" | "updated";
export type SortDirection = "asc" | "desc";

export function getCreatedModuleRowValues(item: CreatedModuleRecord) {
  return {
    module: getModuleLabel(item.module),
    type: formatBuilderModuleTypeLabel(item.module.type),
    section: formatSectionTitle(item.sectionTitle),
    moduleClass: getDisplayModuleClassForModule(item.module)
  };
}

export function compareCreatedModuleRecords(
  left: CreatedModuleRecord,
  right: CreatedModuleRecord,
  sortKey: CreatedModuleSortKey,
  sortDirection: SortDirection
) {
  if (sortKey === "updated") {
    const result = left.updatedAt.localeCompare(right.updatedAt);

    return sortDirection === "asc" ? result : -result;
  }

  const leftValue = getCreatedModuleRowValues(left)[sortKey];
  const rightValue = getCreatedModuleRowValues(right)[sortKey];
  const result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });

  return sortDirection === "asc" ? result : -result;
}

export function BuilderCrudSortButton({
  activeSortKey,
  label,
  onSort,
  sortDirection,
  sortKey
}: {
  activeSortKey: string;
  label: string;
  onSort: (key: string) => void;
  sortDirection: SortDirection;
  sortKey: string;
}) {
  const isActive = activeSortKey === sortKey;
  const indicator = isActive ? (sortDirection === "asc" ? "▲" : "▼") : "↕";

  return (
    <button
      aria-label={`Sort by ${label}`}
      className={`admin-table-sort-button${isActive ? " is-active" : ""}`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="admin-table-sort-indicator">
        {indicator}
      </span>
    </button>
  );
}

export function getCreatedModules(templates: BuilderTemplateRecord[], pages: BuilderPageRecord[]): CreatedModuleRecord[] {
  const templateModules = templates.flatMap((template) =>
    template.layoutSections.flatMap((section) =>
      section.modules.map((module) => ({
        id: `template:${template.id}:${section.id}:${module.id}`,
        kind: "template" as const,
        sourceId: template.id,
        sectionId: section.id,
        moduleId: module.id,
        module,
        sourceName: template.name,
        sectionTitle: section.title || section.layout,
        updatedAt: template.updatedAt
      }))
    )
  );
  const pageModules = pages.flatMap((page) =>
    page.layoutSections.flatMap((section) =>
      section.modules.map((module) => ({
        id: `page:${page.id}:${section.id}:${module.id}`,
        kind: "page" as const,
        sourceId: page.id,
        sectionId: section.id,
        moduleId: module.id,
        module,
        sourceName: page.name,
        sectionTitle: section.title || section.layout,
        updatedAt: page.updatedAt
      }))
    )
  );

  return [...templateModules, ...pageModules];
}

export type RepositoryFilters = {
  name: string;
  className: string;
  contents: string;
  id: string;
  updated: string;
};

export const EMPTY_REPOSITORY_FILTERS: RepositoryFilters = {
  name: "",
  className: "",
  contents: "",
  id: "",
  updated: ""
};

export type RepositorySortKey = "name" | "moduleClass" | "contents" | "id" | "updated";

export function getRepositoryFilterOptions(items: BuilderCellModuleRecord[]) {
  const classes = new Set<string>();

  for (const item of items) {
    classes.add(getDisplayModuleClass(item));
  }

  return { classes: [...classes].sort((a, b) => a.localeCompare(b)) };
}

export function matchesRepositoryFilters(item: BuilderCellModuleRecord, filters: RepositoryFilters) {
  const name = item.name || "Untitled saved module";
  const moduleClass = getDisplayModuleClass(item);
  const contents = getModuleSummary(item);
  const updated = formatTemplateTimestamp(item.updatedAt);
  const nameQuery = filters.name.trim().toLowerCase();
  const contentsQuery = filters.contents.trim().toLowerCase();
  const idQuery = filters.id.trim().toLowerCase();
  const updatedQuery = filters.updated.trim().toLowerCase();

  if (nameQuery && !name.toLowerCase().includes(nameQuery)) {
    return false;
  }

  if (filters.className && moduleClass !== filters.className) {
    return false;
  }

  if (contentsQuery && !contents.toLowerCase().includes(contentsQuery)) {
    return false;
  }

  if (idQuery && !item.id.toLowerCase().includes(idQuery)) {
    return false;
  }

  if (updatedQuery && !updated.toLowerCase().includes(updatedQuery) && !item.updatedAt.toLowerCase().includes(updatedQuery)) {
    return false;
  }

  return true;
}

export function compareRepositoryRecords(
  left: BuilderCellModuleRecord,
  right: BuilderCellModuleRecord,
  sortKey: RepositorySortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  if (sortKey === "updated") {
    result = left.updatedAt.localeCompare(right.updatedAt);
  } else {
    const leftValue =
      sortKey === "name"
        ? left.name || "Untitled saved module"
        : sortKey === "moduleClass"
          ? getDisplayModuleClass(left)
          : sortKey === "contents"
            ? getModuleSummary(left)
            : left.id;
    const rightValue =
      sortKey === "name"
        ? right.name || "Untitled saved module"
        : sortKey === "moduleClass"
          ? getDisplayModuleClass(right)
          : sortKey === "contents"
            ? getModuleSummary(right)
            : right.id;

    result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base", numeric: true });
  }

  return sortDirection === "asc" ? result : -result;
}

export type SavedSectionFilters = {
  name: string;
  layout: string;
  modules: string;
  id: string;
  updated: string;
};

export const EMPTY_SAVED_SECTION_FILTERS: SavedSectionFilters = {
  name: "",
  layout: "",
  modules: "",
  id: "",
  updated: ""
};

export type SavedSectionSortKey = "name" | "layout" | "modules" | "id" | "updated";

export function getSavedSectionFilterOptions(items: BuilderSavedSectionRecord[]) {
  const layouts = new Set<string>();

  for (const item of items) {
    layouts.add(item.section.layout);
  }

  return { layouts: [...layouts].sort((a, b) => a.localeCompare(b)) };
}

export function matchesSavedSectionFilters(item: BuilderSavedSectionRecord, filters: SavedSectionFilters) {
  const name = item.name || "Untitled saved section";
  const layout = item.section.layout;
  const modules = item.section.modules.length;
  const updated = formatTemplateTimestamp(item.updatedAt);
  const nameQuery = filters.name.trim().toLowerCase();
  const modulesQuery = filters.modules.trim().toLowerCase();
  const idQuery = filters.id.trim().toLowerCase();
  const updatedQuery = filters.updated.trim().toLowerCase();

  if (nameQuery && !name.toLowerCase().includes(nameQuery)) {
    return false;
  }

  if (filters.layout && layout !== filters.layout) {
    return false;
  }

  if (modulesQuery && !String(modules).includes(modulesQuery)) {
    return false;
  }

  if (idQuery && !item.id.toLowerCase().includes(idQuery)) {
    return false;
  }

  if (updatedQuery && !updated.toLowerCase().includes(updatedQuery) && !item.updatedAt.toLowerCase().includes(updatedQuery)) {
    return false;
  }

  return true;
}

export function compareSavedSections(
  left: BuilderSavedSectionRecord,
  right: BuilderSavedSectionRecord,
  sortKey: SavedSectionSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  if (sortKey === "modules") {
    result = left.section.modules.length - right.section.modules.length;
  } else if (sortKey === "updated") {
    result = left.updatedAt.localeCompare(right.updatedAt);
  } else {
    const leftValue =
      sortKey === "name" ? left.name || "Untitled saved section" : sortKey === "layout" ? left.section.layout : left.id;
    const rightValue =
      sortKey === "name" ? right.name || "Untitled saved section" : sortKey === "layout" ? right.section.layout : right.id;

    result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base", numeric: true });
  }

  return sortDirection === "asc" ? result : -result;
}

