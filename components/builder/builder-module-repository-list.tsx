import type { BuilderCellModuleRecord, BuilderSavedSectionRecord } from "@/lib/builder-template";
import { useState } from "react";
import { formatTemplateTimestamp } from "./builder-utils";

type BuilderModuleRepositoryListProps = {
  cellModules: BuilderCellModuleRecord[];
  savedSections: BuilderSavedSectionRecord[];
  isSaving: boolean;
  onRenameSavedModule: (cellModuleId: string, currentName: string) => void;
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
  isSaving,
  title,
  isCollapsed,
  onToggle,
  onRenameSavedModule,
  onDeleteSavedModule
}: {
  emptyLabel: string;
  items: BuilderCellModuleRecord[];
  isSaving: boolean;
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onRenameSavedModule: BuilderModuleRepositoryListProps["onRenameSavedModule"];
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
                        aria-label="Rename saved module"
                        className="polls-icon-button"
                        disabled={isSaving}
                        onClick={() => onRenameSavedModule(item.id, item.name)}
                        title="Rename"
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
  savedSections,
  isSaving,
  onRenameSavedModule,
  onDeleteSavedModule,
  onRenameSavedSection,
  onDeleteSavedSection
}: BuilderModuleRepositoryListProps) {
  const [collapsedPanels, setCollapsedPanels] = useState({
    modules: false,
    cells: false,
    sections: false
  });
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);

  function togglePanel(panel: keyof typeof collapsedPanels) {
    setCollapsedPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }

  return (
    <>
      <RepositoryTable
        emptyLabel="No saved modules found."
        isCollapsed={collapsedPanels.modules}
        isSaving={isSaving}
        items={savedModules}
        onDeleteSavedModule={onDeleteSavedModule}
        onRenameSavedModule={onRenameSavedModule}
        onToggle={() => togglePanel("modules")}
        title="Saved Modules"
      />
      <RepositoryTable
        emptyLabel="No saved cells found."
        isCollapsed={collapsedPanels.cells}
        isSaving={isSaving}
        items={savedCells}
        onDeleteSavedModule={onDeleteSavedModule}
        onRenameSavedModule={onRenameSavedModule}
        onToggle={() => togglePanel("cells")}
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
