
import type { BackgroundSettings, BuilderCellModuleRecord, BuilderProductRecord, BuilderTemplateModule } from "@/lib/builder-template";

import { Fragment, useMemo, useState } from "react";

import { BuilderCollapseIcon } from "./builder-collapse-icon";

import { BuilderModuleCard } from "./builder-module-card";

import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";

import { formatTemplateTimestamp } from "./builder-utils";

import { BuilderCrudSortButton, BuilderModuleRepositoryListProps, EMPTY_REPOSITORY_FILTERS, RepositoryFilters, RepositorySortKey, SortDirection, compareRepositoryRecords, getDisplayModuleClass, getModuleClassOptions, getModuleSummary, getRepositoryFilterOptions, matchesRepositoryFilters } from "./builder-repository-helpers";

export function RepositoryTable({
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
  onOpenEditingRichTextGallery,
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
  onOpenEditingRichTextGallery: (moduleId: string, anchor?: BuilderModalAnchor) => void;
  onOpenEditingSocialIconGallery: (moduleId: string, itemId: string) => void;
  onSaveSavedModule: BuilderModuleRepositoryListProps["onSaveSavedModule"];
  onCloneSavedModule: BuilderModuleRepositoryListProps["onCloneSavedModule"];
  onDeleteSavedModule: BuilderModuleRepositoryListProps["onDeleteSavedModule"];
}) {
  const [filters, setFilters] = useState<RepositoryFilters>(EMPTY_REPOSITORY_FILTERS);
  const [sortKey, setSortKey] = useState<RepositorySortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const filterOptions = useMemo(() => getRepositoryFilterOptions(items), [items]);
  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => matchesRepositoryFilters(item, filters));

    return [...filtered].sort((left, right) => compareRepositoryRecords(left, right, sortKey, sortDirection));
  }, [filters, items, sortDirection, sortKey]);

  function updateFilter<K extends keyof RepositoryFilters>(key: K, value: RepositoryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSort(nextKey: string) {
    const typedKey = nextKey as RepositorySortKey;

    if (sortKey === typedKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(typedKey);
    setSortDirection("asc");
  }

  return (
    <div className="builder-toolbar-shell">
      <div className="builder-panel-toggle-row">
        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          className="builder-panel-toggle"
          onClick={onToggle}
          title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          type="button"
        >
          <span className="panel-label">{title}</span>
          <span className="builder-panel-toggle-icon"><BuilderCollapseIcon expanded={!isCollapsed} /></span>
        </button>
      </div>
      {!isCollapsed ? (
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr className="builder-crud-filter-row">
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Name</span>
                    <input
                      className="builder-crud-filter-input"
                      placeholder="Search"
                      type="search"
                      value={filters.name}
                      onChange={(event) => updateFilter("name", event.target.value)}
                    />
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
                    <span className="builder-crud-filter-label">Filter Contents</span>
                    <input
                      className="builder-crud-filter-input"
                      placeholder="Search"
                      type="search"
                      value={filters.contents}
                      onChange={(event) => updateFilter("contents", event.target.value)}
                    />
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter ID</span>
                    <input
                      className="builder-crud-filter-input"
                      placeholder="Search"
                      type="search"
                      value={filters.id}
                      onChange={(event) => updateFilter("id", event.target.value)}
                    />
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
                    label="Name"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="name"
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
                    label="Contents"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="contents"
                  />
                </th>
                <th scope="col">
                  <BuilderCrudSortButton
                    activeSortKey={sortKey}
                    label="ID"
                    onSort={handleSort}
                    sortDirection={sortDirection}
                    sortKey="id"
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
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
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
                              <button
                                className="submit-button admin-blog-add-button"
                                disabled={isSaving || !editingId}
                                onClick={() => {
                                  void onSaveSavedModule(
                                    editingId,
                                    editingName,
                                    editingModuleClass,
                                    editingModules
                                  );
                                }}
                                type="button"
                              >
                                {isSaving ? "Saving..." : "Save Module"}
                              </button>
                              <button className="secondary-button" onClick={onCancelEditing} type="button">
                                Cancel
                              </button>
                            </div>
                          </div>
                          <div className="builder-saved-module-column-pod builder-saved-module-editor-stack">
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
                                onOpenRichTextGallery={(anchor) => onOpenEditingRichTextGallery(module.id, anchor)}
                                onOpenSocialIconGallery={(itemId) => onOpenEditingSocialIconGallery(module.id, itemId)}
                                onRemove={() => undefined}
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
              {visibleItems.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {items.length === 0 ? emptyLabel : "No saved records match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

