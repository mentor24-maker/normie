
import type { BackgroundSettings, BuilderProductRecord, BuilderTemplateModule } from "@/lib/builder-template";

import { Fragment, useMemo, useState } from "react";

import { BuilderCollapseIcon } from "./builder-collapse-icon";

import { BuilderModuleCard } from "./builder-module-card";

import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";

import { formatTemplateTimestamp } from "./builder-utils";

import { BuilderCrudSortButton, BuilderModuleRepositoryListProps, CreatedModuleFilters, CreatedModuleRecord, CreatedModuleSortKey, CrudTruncateCell, EMPTY_CREATED_MODULE_FILTERS, SortDirection, compareCreatedModuleRecords, formatBuilderModuleTypeLabel, formatSectionTitle, getCreatedModuleFilterOptions, getCreatedModuleSourceLabel, getDisplayModuleClassForModule, getModuleLabel, matchesCreatedModuleFilters } from "./builder-repository-helpers";

export function CreatedModulesTable({
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
  onOpenEditingCreatedRichTextGallery,
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
  onOpenEditingCreatedRichTextGallery: (anchor?: BuilderModalAnchor) => void;
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

  function handleSort(nextKey: string) {
    const typedKey = nextKey as CreatedModuleSortKey;

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
          aria-label={isCollapsed ? "Expand All Created Modules" : "Collapse All Created Modules"}
          className="builder-panel-toggle"
          onClick={onToggle}
          title={isCollapsed ? "Expand All Created Modules" : "Collapse All Created Modules"}
          type="button"
        >
          <span className="panel-label">All Created Modules</span>
          <span className="builder-panel-toggle-icon"><BuilderCollapseIcon expanded={!isCollapsed} /></span>
        </button>
      </div>
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
                              <button
                                className="submit-button admin-blog-add-button"
                                disabled={isSaving || !editingCreatedModule}
                                onClick={() => {
                                  if (!editingCreatedModule) {
                                    return;
                                  }

                                  void onSaveCreatedModule(
                                    {
                                      kind: item.kind,
                                      sourceId: item.sourceId,
                                      sectionId: item.sectionId,
                                      moduleId: item.moduleId
                                    },
                                    editingCreatedModule
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
                          <div className="builder-saved-module-column-pod">
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
                              onOpenRichTextGallery={onOpenEditingCreatedRichTextGallery}
                              onOpenSocialIconGallery={onOpenEditingCreatedSocialIconGallery}
                              onRemove={() => undefined}
                              onToggleExpanded={onToggleEditingCreatedExpanded}
                              onUpdateModule={onUpdateEditingCreatedModule}
                              onUpdateModuleBackground={onUpdateEditingCreatedModuleBackground}
                              onUploadMedia={() => undefined}
                              sectionId="created-module-editor"
                            />
                          </div>
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

