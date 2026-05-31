import type { AdminMediaItem } from "@/lib/admin-media";
import type {
  BackgroundSettings,
  BuilderCellModuleRecord,
  BuilderPageRecord,
  BuilderProductRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateRecord,
  BuilderTemplateModule,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { Fragment, useMemo, useState } from "react";
import { createDefaultBackgroundSettings, createEmptyModule, normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { BuilderGalleryModal } from "./builder-gallery-modal";
import { BuilderModuleCard } from "./builder-module-card";
import { BuilderModulePaletteModal, type ModulePaletteAnchor } from "./builder-module-palette-modal";
import { BuilderSectionCard } from "./builder-section-card";
import { formatTemplateTimestamp } from "./builder-utils";
import { layoutOptions, modulePaletteGroups, modulePaletteItems } from "./builder-types";
import {
  BUILDER_MODULE_CLASS_OPTIONS,
  getBuilderModuleClassOptions,
  inferModuleClassFromBuilderModules,
  resolveModuleClassForBuilderModule,
  resolveSavedModuleClass
} from "@/lib/module-class-triggers";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";

function getModuleClassOptions(currentValue: string) {
  return getBuilderModuleClassOptions(currentValue);
}

type BuilderModuleRepositoryListProps = {
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
};

export type CreatedModuleSource = {
  kind: "template" | "page";
  sourceId: string;
  sectionId: string;
  moduleId: string;
};

type CreatedModuleRecord = CreatedModuleSource & {
  id: string;
  module: BuilderTemplateModule;
  sourceName: string;
  sectionTitle: string;
  updatedAt: string;
};

function getModuleSummary(cellModule: BuilderCellModuleRecord) {
  if (cellModule.modules.length === 1) {
    return cellModule.modules[0]?.type || "module";
  }

  return `${cellModule.modules.length} modules`;
}

function getInferredModuleClass(modules: BuilderTemplateModule[]) {
  return inferModuleClassFromBuilderModules(modules);
}

function getDisplayModuleClassForModule(module: BuilderTemplateModule) {
  return resolveModuleClassForBuilderModule(module) || "Unclassified";
}

function getDisplayModuleClass(cellModule: BuilderCellModuleRecord) {
  return resolveSavedModuleClass(cellModule.moduleClass, cellModule.modules) || "Unclassified";
}

function stripRichTextPreview(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const MODULE_TYPE_LABELS = new Map(modulePaletteGroups.map((group) => [group.value, group.label]));

function formatBuilderModuleTypeLabel(type: string): string {
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

function formatSectionTitle(sectionTitle: string): string {
  const trimmed = sectionTitle.trim();

  if (!trimmed) {
    return "Untitled Section";
  }

  return layoutOptions.find((option) => option.value === trimmed)?.label ?? trimmed;
}

function CrudTruncateCell({ text, title }: { text: string; title?: string }) {
  const resolvedTitle = title ?? text;

  return (
    <span className="builder-crud-truncate" title={resolvedTitle}>
      {text}
    </span>
  );
}

function getModuleLabel(module: BuilderTemplateModule) {
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

function getCreatedModuleSourceLabel(item: CreatedModuleRecord) {
  const kindLabel = item.kind === "template" ? "Template" : "Page";
  const sourceName = item.sourceName?.trim() || "Untitled";

  return `${kindLabel}: ${sourceName}`;
}

type CreatedModuleFilters = {
  module: string;
  type: string;
  section: string;
  className: string;
  updated: string;
};

const EMPTY_CREATED_MODULE_FILTERS: CreatedModuleFilters = {
  module: "",
  type: "",
  section: "",
  className: "",
  updated: ""
};

function getCreatedModuleFilterOptions(items: CreatedModuleRecord[]) {
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

function matchesCreatedModuleFilters(item: CreatedModuleRecord, filters: CreatedModuleFilters) {
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

type CreatedModuleSortKey = "module" | "type" | "section" | "moduleClass" | "updated";
type SortDirection = "asc" | "desc";

function getCreatedModuleRowValues(item: CreatedModuleRecord) {
  return {
    module: getModuleLabel(item.module),
    type: formatBuilderModuleTypeLabel(item.module.type),
    section: formatSectionTitle(item.sectionTitle),
    moduleClass: getDisplayModuleClassForModule(item.module)
  };
}

function compareCreatedModuleRecords(
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

function BuilderCrudSortButton({
  activeSortKey,
  label,
  onSort,
  sortDirection,
  sortKey
}: {
  activeSortKey: CreatedModuleSortKey;
  label: string;
  onSort: (key: CreatedModuleSortKey) => void;
  sortDirection: SortDirection;
  sortKey: CreatedModuleSortKey;
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

function getCreatedModules(templates: BuilderTemplateRecord[], pages: BuilderPageRecord[]): CreatedModuleRecord[] {
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

function CreatedModulesTable({
  emptyLabel,
  items,
  products,
  isSaving,
  isCollapsed,
  editingCreatedId,
  editingCreatedModule,
  editingCreatedExpanded,
  onToggle,
  onStartEditing,
  onCancelEditing,
  onToggleEditingCreatedExpanded,
  onUpdateEditingCreatedModule,
  onUpdateEditingCreatedModuleBackground,
  onOpenEditingCreatedModuleGallery,
  onOpenEditingCreatedSocialIconGallery,
  onSaveCreatedModule,
  onCloneCreatedModule,
  onDeleteCreatedModule
}: {
  emptyLabel: string;
  items: CreatedModuleRecord[];
  products: BuilderProductRecord[];
  isSaving: boolean;
  isCollapsed: boolean;
  editingCreatedId: string;
  editingCreatedModule: BuilderTemplateModule | null;
  editingCreatedExpanded: boolean;
  onToggle: () => void;
  onStartEditing: (item: CreatedModuleRecord) => void;
  onCancelEditing: () => void;
  onToggleEditingCreatedExpanded: () => void;
  onUpdateEditingCreatedModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateEditingCreatedModuleBackground: (updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onOpenEditingCreatedModuleGallery: () => void;
  onOpenEditingCreatedSocialIconGallery: (itemId: string) => void;
  onSaveCreatedModule: BuilderModuleRepositoryListProps["onSaveCreatedModule"];
  onCloneCreatedModule: BuilderModuleRepositoryListProps["onCloneCreatedModule"];
  onDeleteCreatedModule: BuilderModuleRepositoryListProps["onDeleteCreatedModule"];
}) {
  const [filters, setFilters] = useState<CreatedModuleFilters>(EMPTY_CREATED_MODULE_FILTERS);
  const [sortKey, setSortKey] = useState<CreatedModuleSortKey>("module");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const filterOptions = useMemo(() => getCreatedModuleFilterOptions(items), [items]);
  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => matchesCreatedModuleFilters(item, filters));

    return [...filtered].sort((left, right) => compareCreatedModuleRecords(left, right, sortKey, sortDirection));
  }, [filters, items, sortDirection, sortKey]);

  function updateFilter<K extends keyof CreatedModuleFilters>(key: K, value: CreatedModuleFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSort(nextKey: CreatedModuleSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <div className="builder-toolbar-shell">
      <button
        aria-expanded={!isCollapsed}
        className="builder-panel-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="panel-label">All Created Modules</span>
        <span className="builder-panel-toggle-icon">{isCollapsed ? "▸" : "▾"}</span>
      </button>
      {!isCollapsed ? (
        <>
          <p className="panel-copy admin-copy builder-modules-crud-intro">
            Modules appear here after you add them to a page or template in the Pages workspace. New types such as
            Speech Bubble live in Pages → Module Library.
          </p>
          <div className="table-shell builder-templates-shell builder-modules-crud-shell">
            <table className="polls-table builder-templates-table builder-modules-crud-table">
            <colgroup>
              <col className="builder-crud-col-module" />
              <col className="builder-crud-col-type" />
              <col className="builder-crud-col-section" />
              <col className="builder-crud-col-class" />
              <col className="builder-crud-col-updated" />
              <col className="builder-crud-col-actions" />
            </colgroup>
            <thead>
              <tr className="builder-crud-filter-row">
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Module</span>
                    <input
                      className="builder-crud-filter-input"
                      placeholder="Search"
                      type="search"
                      value={filters.module}
                      onChange={(event) => updateFilter("module", event.target.value)}
                    />
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Type</span>
                    <select
                      className="builder-crud-filter-select"
                      value={filters.type}
                      onChange={(event) => updateFilter("type", event.target.value)}
                    >
                      <option value="">All</option>
                      {filterOptions.types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Section</span>
                    <select
                      className="builder-crud-filter-select"
                      value={filters.section}
                      onChange={(event) => updateFilter("section", event.target.value)}
                    >
                      <option value="">All</option>
                      {filterOptions.sections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Class</span>
                    <select
                      className="builder-crud-filter-select"
                      value={filters.className}
                      onChange={(event) => updateFilter("className", event.target.value)}
                    >
                      <option value="">All</option>
                      {filterOptions.classes.map((moduleClass) => (
                        <option key={moduleClass} value={moduleClass}>
                          {moduleClass}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Updated</span>
                    <input
                      className="builder-crud-filter-input"
                      placeholder="Search"
                      type="search"
                      value={filters.updated}
                      onChange={(event) => updateFilter("updated", event.target.value)}
                    />
                  </label>
                </th>
                <th className="crud-actions-cell" scope="col" />
              </tr>
              <tr>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="Module"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="module"
                  />
                </th>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="Type"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="type"
                  />
                </th>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="Section"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="section"
                  />
                </th>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="Class"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="moduleClass"
                  />
                </th>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="Updated"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="updated"
                  />
                </th>
                <th className="crud-actions-cell" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const moduleLabel = getModuleLabel(item.module);
                const moduleTypeLabel = formatBuilderModuleTypeLabel(item.module.type);
                const sectionLabel = formatSectionTitle(item.sectionTitle);
                const moduleClassLabel = getDisplayModuleClassForModule(item.module);
                const updatedLabel = formatTemplateTimestamp(item.updatedAt);

                return (
                <Fragment key={item.id}>
                  <tr>
                    <td className="builder-crud-cell-module">
                      <strong className="builder-crud-truncate" title={moduleLabel}>
                        {moduleLabel}
                      </strong>
                    </td>
                    <td>
                      <CrudTruncateCell text={moduleTypeLabel} title={moduleTypeLabel} />
                    </td>
                    <td>
                      <CrudTruncateCell text={sectionLabel} title={sectionLabel} />
                    </td>
                    <td>
                      <CrudTruncateCell text={moduleClassLabel} title={moduleClassLabel} />
                    </td>
                    <td className="builder-crud-cell-updated">
                      <CrudTruncateCell text={updatedLabel} title={updatedLabel} />
                    </td>
                    <td className="crud-actions-cell">
                      <div className="builder-template-actions">
                        <button
                          aria-label="Edit created module"
                          className="polls-icon-button polls-icon-button-edit"
                          disabled={isSaving}
                          onClick={() => onStartEditing(item)}
                          title="Edit"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Clone created module"
                          className="polls-icon-button polls-icon-button-view"
                          disabled={isSaving}
                          onClick={() => onCloneCreatedModule(item.module, moduleLabel)}
                          title="Clone"
                          type="button"
                        >
                          ⧉
                        </button>
                        <button
                          aria-label="Delete created module"
                          className="polls-icon-button polls-icon-button-danger"
                          disabled={isSaving}
                          onClick={() => onDeleteCreatedModule(item, moduleLabel)}
                          title="Delete"
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingCreatedId === item.id && editingCreatedModule ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="builder-saved-module-editor">
                          <div className="builder-meta-grid">
                            <div>
                              <strong>{getCreatedModuleSourceLabel(item)}</strong>
                              <p className="builder-module-editor-copy">
                                Editing the live module in {sectionLabel}.
                              </p>
                            </div>
                            <div className="builder-meta-actions">
                              <button className="secondary-button" onClick={onCancelEditing} type="button">
                                Cancel
                              </button>
                              <button
                                className="submit-button admin-blog-add-button"
                                disabled={isSaving}
                                onClick={() => onSaveCreatedModule(item, editingCreatedModule)}
                                type="button"
                              >
                                {isSaving ? "Saving..." : "Save Module"}
                              </button>
                            </div>
                          </div>
                          <BuilderModuleCard
                            editorDevice="browser"
                            hideHeaderActions
                            isExpanded={editingCreatedExpanded}
                            module={editingCreatedModule}
                            products={products}
                            onClone={() => undefined}
                            onMoveDown={() => undefined}
                            onMoveUp={() => undefined}
                            onOpenGallery={onOpenEditingCreatedModuleGallery}
                            onOpenSocialIconGallery={onOpenEditingCreatedSocialIconGallery}
                            onRemove={() => undefined}
                            onSaveModule={() => undefined}
                            onToggleExpanded={onToggleEditingCreatedExpanded}
                            onUpdateModule={onUpdateEditingCreatedModule}
                            onUpdateModuleBackground={onUpdateEditingCreatedModuleBackground}
                            onUploadMedia={() => undefined}
                            sectionId="created-module-editor"
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
                );
              })}
              {visibleItems.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {items.length === 0 ? emptyLabel : "No modules match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </>
      ) : null}
    </div>
  );
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
  editingModuleClass,
  editingExpandedModuleIds,
  editingModules,
  onToggle,
  onToggleEditingModuleExpanded,
  onStartEditing,
  onCancelEditing,
  onSetEditingName,
  onSetEditingModuleClass,
  onUpdateEditingModule,
  onUpdateEditingModuleBackground,
  onOpenEditingModuleGallery,
  onOpenEditingSocialIconGallery,
  onSaveSavedModule,
  onCloneSavedModule,
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
  editingModuleClass: string;
  editingExpandedModuleIds: string[];
  editingModules: BuilderTemplateModule[];
  onToggle: () => void;
  onToggleEditingModuleExpanded: (moduleId: string) => void;
  onStartEditing: (item: BuilderCellModuleRecord) => void;
  onCancelEditing: () => void;
  onSetEditingName: (name: string) => void;
  onSetEditingModuleClass: (moduleClass: string) => void;
  onUpdateEditingModule: (moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateEditingModuleBackground: (moduleId: string, updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onOpenEditingModuleGallery: (moduleId: string) => void;
  onOpenEditingSocialIconGallery: (moduleId: string, itemId: string) => void;
  onSaveSavedModule: BuilderModuleRepositoryListProps["onSaveSavedModule"];
  onCloneSavedModule: BuilderModuleRepositoryListProps["onCloneSavedModule"];
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
                <th>Class</th>
                <th>Contents</th>
                <th>ID</th>
                <th>Updated</th>
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "Untitled saved module"}</strong>
                    </td>
                    <td>{getDisplayModuleClass(item)}</td>
                    <td>{getModuleSummary(item)}</td>
                    <td className="template-id-cell">
                      <code>{item.id}</code>
                    </td>
                    <td>{formatTemplateTimestamp(item.updatedAt)}</td>
                    <td className="crud-actions-cell">
                      <div className="builder-template-actions">
                        <button
                          aria-label="Edit saved module"
                          className="polls-icon-button polls-icon-button-edit"
                          disabled={isSaving}
                          onClick={() => onStartEditing(item)}
                          title="Edit"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Clone"
                          className="polls-icon-button polls-icon-button-view"
                          disabled={isSaving}
                          onClick={() => onCloneSavedModule(item.id)}
                          title="Clone"
                          type="button"
                        >
                          ⧉
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
                      <td colSpan={6}>
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
                            <label className="field">
                              <span>Module class</span>
                              <select
                                value={editingModuleClass}
                                onChange={(event) => onSetEditingModuleClass(event.target.value)}
                              >
                                {getModuleClassOptions(editingModuleClass).map((moduleClass) => (
                                  <option key={moduleClass} value={moduleClass}>
                                    {moduleClass}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="builder-meta-actions">
                              <button className="secondary-button" onClick={onCancelEditing} type="button">
                                Cancel
                              </button>
                              <button
                                className="submit-button admin-blog-add-button"
                                disabled={isSaving}
                                onClick={() => onSaveSavedModule(item.id, editingName, editingModuleClass, editingModules)}
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
                                moduleClassOverride={editingModuleClass}
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
                  <td className="empty-cell" colSpan={6}>{emptyLabel}</td>
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
  pages,
  products,
  galleryMedia,
  isUploadingMedia,
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
  onDeleteSavedSection
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
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const [editingSectionPaletteColumn, setEditingSectionPaletteColumn] = useState("");
  const [editingSectionPaletteAnchor, setEditingSectionPaletteAnchor] = useState<ModulePaletteAnchor | null>(null);
  const [activeModuleGroup, setActiveModuleGroup] = useState<ModulePaletteGroup | null>(null);
  const [editingGalleryTarget, setEditingGalleryTarget] = useState<
    | { kind: "created-module" }
    | { kind: "created-social-icon"; itemId: string }
    | { kind: "module"; moduleId: string }
    | { kind: "social-icon"; moduleId: string; itemId: string }
    | null
  >(null);
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);
  const createdModules = getCreatedModules(templates, pages);

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
    setEditingModuleClass(getDisplayModuleClass(item));
    setEditingModules(item.modules.map((module) => ({ ...module, settings: { ...module.settings } })));
    setEditingExpandedModuleIds([]);
  }

  function startEditingCreatedModule(item: CreatedModuleRecord) {
    setEditingCreatedId(item.id);
    setEditingCreatedModule({ ...item.module, settings: { ...item.module.settings } });
    setEditingCreatedExpanded(true);
  }

  function cancelEditingCreatedModule() {
    setEditingCreatedId("");
    setEditingCreatedModule(null);
    setEditingCreatedExpanded(false);
  }

  function cancelEditing() {
    setEditingId("");
    setEditingName("");
    setEditingModuleClass("");
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

  function updateEditingCreatedModule(updater: (current: BuilderTemplateModule) => BuilderTemplateModule) {
    setEditingCreatedModule((current) => (current ? updater(current) : current));
  }

  function selectEditingGalleryImage(imagePath: string) {
    if (!editingGalleryTarget) return;

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
    if (!editingSection) return;

    const builderModule = editingSection.modules.find((candidate) => candidate.id === moduleId);
    if (!builderModule) return;

    const fallbackName = builderModule.name || builderModule.type;
    const name = window.prompt("Name this saved module", fallbackName)?.trim();
    if (!name) return;

    const moduleClass = window.prompt("Module class (Navigation, Headings, etc.)", getInferredModuleClass([builderModule]))?.trim();
    if (moduleClass === undefined) return;

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
                  <th className="crud-actions-cell">Actions</th>
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
                      <td className="crud-actions-cell">
                        <div className="builder-template-actions">
                          <button
                            aria-label="Edit saved section"
                            className="polls-icon-button polls-icon-button-edit"
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
                                  className="submit-button admin-blog-add-button"
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
                              onOpenButtonBackgroundGallery={() => undefined}
                              onOpenModulePalette={(column, anchor) => {
                                setEditingSectionPaletteColumn(column);
                                setEditingSectionPaletteAnchor(anchor ?? null);
                              }}
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
                              onUploadButtonBackgroundMedia={() => undefined}
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
          isUploading={isUploadingMedia}
          onSelectImage={selectEditingGalleryImage}
          onClose={() => setEditingGalleryTarget(null)}
        />
      ) : null}
      {editingSectionGalleryTarget ? (
        <BuilderGalleryModal
          isUploading={isUploadingMedia}
          onSelectImage={selectEditingSectionGalleryImage}
          onClose={() => setEditingSectionGalleryTarget(null)}
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
