
import type { BackgroundSettings, BuilderCellModuleRecord, BuilderProductRecord, BuilderSavedSectionRecord, BuilderTemplateModule, BuilderTemplateSection } from "@/lib/builder-template";

import { Fragment, useMemo, useState } from "react";

import { BuilderCollapseIcon } from "./builder-collapse-icon";

import { type ModulePaletteAnchor } from "./builder-module-palette-modal";
import { BuilderSectionCard } from "./builder-section-card";
import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";

import { formatTemplateTimestamp } from "./builder-utils";

import { BuilderCrudSortButton, EMPTY_SAVED_SECTION_FILTERS, SavedSectionFilters, SavedSectionSortKey, SortDirection, compareSavedSections, getSavedSectionFilterOptions, matchesSavedSectionFilters } from "./builder-repository-helpers";

export function SavedSectionsTable({
  savedSections,
  cellModules,
  products,
  isSaving,
  isCollapsed,
  editingSectionId,
  editingSectionName,
  editingSection,
  editingSectionCollapsed,
  editingSectionExpandedModuleIds,
  onToggle,
  onStartEditingSection,
  onDeleteSavedSection,
  onSetEditingSectionName,
  onSaveSavedSection,
  onCancelEditingSection,
  onCloneEditingSectionModule,
  onDropEditingSectionModule,
  onInsertEditingSectionCellModule,
  onMoveEditingSectionModule,
  onOpenEditingSectionModuleGallery,
  onOpenEditingSectionRichTextGallery,
  onOpenEditingSectionBackgroundGallery,
  onOpenEditingSectionSocialIconGallery,
  onOpenEditingSectionModulePalette,
  onRemoveEditingSectionModule,
  onSaveEditingSectionCellModules,
  onSaveEditingSectionModule,
  onToggleEditingSectionCollapsed,
  onToggleEditingSectionModuleExpanded,
  onUpdateEditingSectionCellBackground,
  onUpdateEditingSectionCellRecord,
  onUpdateEditingSectionModule,
  onUpdateEditingSectionModuleBackground,
  onUpdateEditingSection
}: {
  savedSections: BuilderSavedSectionRecord[];
  cellModules: BuilderCellModuleRecord[];
  products: BuilderProductRecord[];
  isSaving: boolean;
  isCollapsed: boolean;
  editingSectionId: string;
  editingSectionName: string;
  editingSection: BuilderTemplateSection | null;
  editingSectionCollapsed: boolean;
  editingSectionExpandedModuleIds: string[];
  onToggle: () => void;
  onStartEditingSection: (section: BuilderSavedSectionRecord) => void;
  onDeleteSavedSection: (sectionId: string, currentName: string) => void;
  onSetEditingSectionName: (name: string) => void;
  onSaveSavedSection: (sectionId: string, name: string, section: BuilderTemplateSection) => void;
  onCancelEditingSection: () => void;
  onCloneEditingSectionModule: (moduleId: string) => void;
  onDropEditingSectionModule: (
    moduleId: string,
    sourceSectionId: string,
    targetSectionId: string,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) => void;
  onInsertEditingSectionCellModule: (column: string, cellModuleId: string, moduleCount: 1 | "many") => void;
  onMoveEditingSectionModule: (moduleId: string, direction: -1 | 1) => void;
  onOpenEditingSectionModuleGallery: (moduleId: string) => void;
  onOpenEditingSectionRichTextGallery: (moduleId: string, anchor?: BuilderModalAnchor) => void;
  onOpenEditingSectionBackgroundGallery: () => void;
  onOpenEditingSectionSocialIconGallery: (moduleId: string, itemId: string) => void;
  onOpenEditingSectionModulePalette: (column: string, anchor?: ModulePaletteAnchor) => void;
  onRemoveEditingSectionModule: (moduleId: string) => void;
  onSaveEditingSectionCellModules: (column: string) => void;
  onSaveEditingSectionModule: (moduleId: string) => void;
  onToggleEditingSectionCollapsed: () => void;
  onToggleEditingSectionModuleExpanded: (moduleId: string) => void;
  onUpdateEditingSectionCellBackground: (column: string, updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onUpdateEditingSectionCellRecord: (key: keyof BuilderTemplateSection, column: string, value: string) => void;
  onUpdateEditingSectionModule: (moduleId: string, updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateEditingSectionModuleBackground: (
    moduleId: string,
    updater: (background: BackgroundSettings) => BackgroundSettings
  ) => void;
  onUpdateEditingSection: (updater: (section: BuilderTemplateSection) => BuilderTemplateSection) => void;
}) {
  const [filters, setFilters] = useState<SavedSectionFilters>(EMPTY_SAVED_SECTION_FILTERS);
  const [sortKey, setSortKey] = useState<SavedSectionSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const filterOptions = useMemo(() => getSavedSectionFilterOptions(savedSections), [savedSections]);
  const visibleSections = useMemo(() => {
    const filtered = savedSections.filter((section) => matchesSavedSectionFilters(section, filters));
    return [...filtered].sort((left, right) => compareSavedSections(left, right, sortKey, sortDirection));
  }, [filters, savedSections, sortDirection, sortKey]);

  function updateFilter<K extends keyof SavedSectionFilters>(key: K, value: SavedSectionFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSort(nextKey: string) {
    const typedKey = nextKey as SavedSectionSortKey;

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
          aria-label={isCollapsed ? "Expand Saved Sections" : "Collapse Saved Sections"}
          className="builder-panel-toggle"
          onClick={onToggle}
          title={isCollapsed ? "Expand Saved Sections" : "Collapse Saved Sections"}
          type="button"
        >
          <span className="panel-label">Saved Sections</span>
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
                    <input className="builder-crud-filter-input" placeholder="Search" type="search" value={filters.name} onChange={(event) => updateFilter("name", event.target.value)} />
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Layout</span>
                    <select className="builder-crud-filter-select" value={filters.layout} onChange={(event) => updateFilter("layout", event.target.value)}>
                      <option value="">All</option>
                      {filterOptions.layouts.map((layout) => (
                        <option key={layout} value={layout}>{layout}</option>
                      ))}
                    </select>
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Modules</span>
                    <input className="builder-crud-filter-input" placeholder="Search" type="search" value={filters.modules} onChange={(event) => updateFilter("modules", event.target.value)} />
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter ID</span>
                    <input className="builder-crud-filter-input" placeholder="Search" type="search" value={filters.id} onChange={(event) => updateFilter("id", event.target.value)} />
                  </label>
                </th>
                <th scope="col">
                  <label className="builder-crud-filter-field">
                    <span className="builder-crud-filter-label">Filter Updated</span>
                    <input className="builder-crud-filter-input" placeholder="Search" type="search" value={filters.updated} onChange={(event) => updateFilter("updated", event.target.value)} />
                  </label>
                </th>
                <th className="crud-actions-cell" scope="col" />
              </tr>
              <tr>
                <th scope="col"><BuilderCrudSortButton activeSortKey={sortKey} label="Name" onSort={handleSort} sortDirection={sortDirection} sortKey="name" /></th>
                <th scope="col"><BuilderCrudSortButton activeSortKey={sortKey} label="Layout" onSort={handleSort} sortDirection={sortDirection} sortKey="layout" /></th>
                <th scope="col"><BuilderCrudSortButton activeSortKey={sortKey} label="Modules" onSort={handleSort} sortDirection={sortDirection} sortKey="modules" /></th>
                <th scope="col"><BuilderCrudSortButton activeSortKey={sortKey} label="ID" onSort={handleSort} sortDirection={sortDirection} sortKey="id" /></th>
                <th scope="col"><BuilderCrudSortButton activeSortKey={sortKey} label="Updated" onSort={handleSort} sortDirection={sortDirection} sortKey="updated" /></th>
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSections.map((section) => (
                <Fragment key={section.id}>
                  <tr>
                    <td><strong>{section.name || "Untitled saved section"}</strong></td>
                    <td>{section.section.layout}</td>
                    <td>{section.section.modules.length}</td>
                    <td className="template-id-cell"><code>{section.id}</code></td>
                    <td>{formatTemplateTimestamp(section.updatedAt)}</td>
                    <td className="crud-actions-cell">
                      <div className="builder-template-actions">
                        <button aria-label="Edit saved section" className="polls-icon-button polls-icon-button-edit" disabled={isSaving} onClick={() => onStartEditingSection(section)} title="Edit section" type="button">✎</button>
                        <button aria-label="Delete saved section" className="polls-icon-button polls-icon-button-danger" disabled={isSaving} onClick={() => onDeleteSavedSection(section.id, section.name)} title="Delete" type="button">🗑</button>
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
                              <input type="text" value={editingSectionName} onChange={(event) => onSetEditingSectionName(event.target.value)} />
                            </label>
                            <div className="builder-meta-actions">
                              <button className="submit-button admin-blog-add-button" disabled={isSaving || !editingSection} onClick={() => void onSaveSavedSection(editingSectionId, editingSectionName, editingSection)} type="button">
                                {isSaving ? "Saving..." : "Save Section"}
                              </button>
                              <button className="secondary-button" onClick={onCancelEditingSection} type="button">Cancel</button>
                            </div>
                          </div>
                          <div className="builder-rows-pod">
                            <BuilderSectionCard
                            cellModules={cellModules}
                            editorDevice="browser"
                            expandedModuleIds={editingSectionExpandedModuleIds}
                            isCollapsed={editingSectionCollapsed}
                            key={editingSection.id}
                            products={products}
                            section={editingSection}
                            sectionIndex={0}
                            onCloneModule={(_, moduleId) => onCloneEditingSectionModule(moduleId)}
                            onSaveModule={onSaveEditingSectionModule}
                            onCloneSection={() => undefined}
                            onDropModule={onDropEditingSectionModule}
                            onInsertCellModule={(column, cellModuleId) => onInsertEditingSectionCellModule(column, cellModuleId, "many")}
                            onInsertSavedModule={(column, cellModuleId) => onInsertEditingSectionCellModule(column, cellModuleId, 1)}
                            onMoveDown={() => undefined}
                            onMoveModule={onMoveEditingSectionModule}
                            onMoveUp={() => undefined}
                            onOpenGallery={onOpenEditingSectionModuleGallery}
                            onOpenRichTextGallery={onOpenEditingSectionRichTextGallery}
                            onOpenButtonBackgroundGallery={() => undefined}
                            onOpenModulePalette={onOpenEditingSectionModulePalette}
                            onOpenSectionBackgroundGallery={onOpenEditingSectionBackgroundGallery}
                            onOpenSocialIconGallery={onOpenEditingSectionSocialIconGallery}
                            onRemove={() => undefined}
                            onRemoveModule={onRemoveEditingSectionModule}
                            onSaveCellModules={onSaveEditingSectionCellModules}
                            onSaveSection={() => onSaveSavedSection(section.id, editingSectionName, editingSection)}
                            onToggleCollapsed={onToggleEditingSectionCollapsed}
                            onToggleModuleExpanded={onToggleEditingSectionModuleExpanded}
                            onUpdateCellBackground={onUpdateEditingSectionCellBackground}
                            onUpdateCellBorderColor={(column, value) => onUpdateEditingSectionCellRecord("cellBorderColor", column, value)}
                            onUpdateCellBorderRadius={(column, value) => onUpdateEditingSectionCellRecord("cellBorderRadius", column, value)}
                            onUpdateCellBorderWidth={(column, value) => onUpdateEditingSectionCellRecord("cellBorderWidth", column, value)}
                            onUpdateCellPadding={(column, value) => onUpdateEditingSectionCellRecord("cellPadding", column, value)}
                            onUpdateModule={onUpdateEditingSectionModule}
                            onUpdateModuleBackground={onUpdateEditingSectionModuleBackground}
                            onUpdateSection={onUpdateEditingSection}
                            onUploadMediaForModule={() => undefined}
                            onUploadButtonBackgroundMedia={() => undefined}
                            onUploadSectionBackgroundMedia={() => undefined}
                          />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {visibleSections.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {savedSections.length === 0 ? "No saved sections found." : "No saved sections match the current filters."}
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

