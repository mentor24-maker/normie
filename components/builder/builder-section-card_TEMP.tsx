import type {
  BackgroundSettings,
  BuilderTemplateLayout,
  BuilderTemplateModule,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { useMemo, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import {
  createDefaultBackgroundSettings,
  getBuilderBackgroundStyle,
  getLayoutColumns,
  getLayoutGridTemplate
} from "@/lib/builder-template";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { BuilderModuleCard } from "./builder-module-card";
import { getAlignmentClass, getSectionBackgroundStyle } from "./builder-utils";
import { layoutOptions } from "./builder-types";

type BuilderSectionCardProps = {
  section: BuilderTemplateSection;
  sectionIndex: number;
  isCollapsed: boolean;
  expandedModuleIds: string[];
  onToggleCollapsed: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdateSection: (updater: (section: BuilderTemplateSection) => BuilderTemplateSection) => void;
  onUpdateCellBackground: (column: string, updater: (bg: BackgroundSettings) => BackgroundSettings) => void;
  onUpdateCellPadding: (column: string, value: string) => void;
  onUpdateCellBorderWidth: (column: string, value: string) => void;
  onUpdateCellBorderColor: (column: string, value: string) => void;
  onUpdateCellBorderRadius: (column: string, value: string) => void;
  onToggleModuleExpanded: (moduleId: string) => void;
  onUpdateModule: (moduleId: string, updater: (module: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateModuleBackground: (moduleId: string, updater: (bg: BackgroundSettings) => BackgroundSettings) => void;
  onMoveModule: (moduleId: string, direction: -1 | 1) => void;
  onDropModule: (
    moduleId: string,
    sourceSectionId: string,
    targetSectionId: string,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) => void;
  onRemoveModule: (moduleId: string) => void;
  onOpenGallery: (moduleId: string) => void;
  onUploadMediaForModule: (moduleId: string, file: File | null) => void;
  onOpenSectionBackgroundGallery: () => void;
  onUploadSectionBackgroundMedia: (file: File | null) => void;
  onOpenModulePalette: (column: string) => void;
};

export function BuilderSectionCard({
  section,
  sectionIndex,
  isCollapsed,
  expandedModuleIds,
  onToggleCollapsed,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateSection,
  onUpdateCellBackground,
  onUpdateCellPadding,
  onUpdateCellBorderWidth,
  onUpdateCellBorderColor,
  onUpdateCellBorderRadius,
  onToggleModuleExpanded,
  onUpdateModule,
  onUpdateModuleBackground,
  onMoveModule,
  onDropModule,
  onRemoveModule,
  onOpenGallery,
  onUploadMediaForModule,
  onOpenSectionBackgroundGallery,
  onUploadSectionBackgroundMedia,
  onOpenModulePalette
}: BuilderSectionCardProps) {
  const columns = getLayoutColumns(section.layout);
  const [collapsedCellPanels, setCollapsedCellPanels] = useState<Record<string, { styles: boolean; content: boolean }>>({});

  const columnModuleMap = useMemo(
    () =>
      Object.fromEntries(columns.map((column) => [column, section.modules.filter((module) => module.column === column)])),
    [columns, section.modules]
  );

  function getCellPanelState(column: string) {
    return collapsedCellPanels[column] ?? { styles: false, content: false };
  }

  function toggleCellPanel(column: string, panel: "styles" | "content") {
    setCollapsedCellPanels((current) => {
      const state = current[column] ?? { styles: false, content: false };
      return {
        ...current,
        [column]: {
          ...state,
          [panel]: !state[panel]
        }
      };
    });
  }

  function getCellStyle(column: string): CSSProperties {
    const borderWidth = Number.parseInt(section.cellBorderWidth[column] ?? "1", 10);
    const borderRadius = Number.parseInt(section.cellBorderRadius[column] ?? "24", 10);

    return {
      ...getBuilderBackgroundStyle(section.cellBackgrounds[column]),
      padding: `${section.cellPadding[column] ?? "18"}px`,
      borderStyle: "solid",
      borderWidth: `${Math.max(Number.isFinite(borderWidth) ? borderWidth : 1, 0)}px`,
      borderColor: section.cellBorderColor[column] ?? "#d9e4ef",
      borderRadius: `${Math.max(Number.isFinite(borderRadius) ? borderRadius : 24, 0)}px`
    };
  }

  function encodeDragPayload(moduleId: string, column: string) {
    return JSON.stringify({
      moduleId,
      sourceSectionId: section.id,
      sourceColumn: column
    });
  }

  function readDragPayload(event: DragEvent<HTMLElement>) {
    try {
      const raw = event.dataTransfer.getData("application/normie-builder-module");
      return raw ? (JSON.parse(raw) as { moduleId: string; sourceSectionId: string; sourceColumn: string }) : null;
    } catch {
      return null;
    }
  }

  function handleModuleDrop(
    event: DragEvent<HTMLElement>,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDragPayload(event);
    if (!payload?.moduleId || !payload?.sourceSectionId) {
      return;
    }
    onDropModule(payload.moduleId, payload.sourceSectionId, section.id, targetColumn, targetBeforeModuleId);
  }

  return (
    <article
      className="builder-section-card"
      style={getSectionBackgroundStyle(section)}
    >
      <div className="builder-section-header">
        <div className="builder-section-title">
          <strong>Section {sectionIndex + 1}</strong>
        </div>
        <div className="builder-section-actions">
          <button
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            className="builder-icon-button"
            onClick={onToggleCollapsed}
            title={isCollapsed ? "Expand section" : "Collapse section"}
            type="button"
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
          <button
            aria-label="Move section up"
            className="builder-icon-button"
            onClick={onMoveUp}
            title="Move section up"
            type="button"
          >
            ↑
          </button>
          <button
            aria-label="Move section down"
            className="builder-icon-button"
            onClick={onMoveDown}
            title="Move section down"
            type="button"
          >
            ↓
          </button>
          <button
            aria-label="Delete section"
            className="builder-icon-button builder-icon-button-danger"
            onClick={onRemove}
            title="Delete section"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {!isCollapsed ? (
        <>
          <div className="builder-section-controls">
            <label className="field">
              <span>Section title</span>
              <input
                type="text"
                value={section.title}
                onChange={(event) =>
                  onUpdateSection((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Hero"
              />
            </label>
            <label className="field">
              <span>Layout</span>
              <select
                value={section.layout}
                onChange={(event) => {
                  const nextLayout = event.target.value as BuilderTemplateLayout;
                  const allowedColumns = new Set(getLayoutColumns(nextLayout));
                  onUpdateSection((current) => ({
                    ...current,
                    layout: nextLayout,
                    modules: current.modules.map((module) => ({
                      ...module,
                      column: allowedColumns.has(module.column)
                        ? module.column
                        : getLayoutColumns(nextLayout)[0]
                    }))
                  }));
                }}
              >
                {layoutOptions.map((layout) => (
                  <option key={layout.value} value={layout.value}>
                    {layout.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Alignment</span>
              <select
                value={section.alignment}
                onChange={(event) =>
                  onUpdateSection((current) => ({
                    ...current,
                    alignment: event.target.value as "left" | "center" | "right"
                  }))
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <BuilderBackgroundControls
              label="Row Background"
              background={section.background}
              compact
              onChange={(updater) =>
                onUpdateSection((current) => ({
                  ...current,
                  background: updater(current.background)
                }))
              }
              onChooseImage={onOpenSectionBackgroundGallery}
              onUploadImage={onUploadSectionBackgroundMedia}
            />
          </div>

          <div
            className={`builder-columns builder-columns-${columns.length} ${getAlignmentClass(section.alignment)}`}
            style={{ gridTemplateColumns: getLayoutGridTemplate(section.layout) }}
          >
            {columns.map((column) => {
              const columnModules = columnModuleMap[column] ?? [];
              const cellPanels = getCellPanelState(column);

              return (
                <div
                  className="builder-column-card"
                  key={column}
                  style={getCellStyle(column)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => handleModuleDrop(event, column)}
                >
                  {columnModules.length > 0 ? (
                    <div className="builder-column-header">
                      <strong>{column}</strong>
                    </div>
                  ) : null}

                  <div className="builder-cell-panel">
                    <button
                      aria-expanded={!cellPanels.styles}
                      className="builder-cell-panel-toggle"
                      onClick={() => toggleCellPanel(column, "styles")}
                      type="button"
                    >
                      <strong>Styles</strong>
                      <span>{cellPanels.styles ? "▸" : "▾"}</span>
                    </button>

                    {!cellPanels.styles ? (
                      <div className="builder-cell-settings-row">
                        <BuilderBackgroundControls
                          label={`${column} Cell Background`}
                          background={section.cellBackgrounds[column] ?? createDefaultBackgroundSettings()}
                          compact
                          onChange={(updater) => onUpdateCellBackground(column, updater)}
                        />
                        <label className="field builder-cell-padding-field">
                          <span>Padding</span>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={section.cellPadding[column] ?? "18"}
                            onChange={(event) => onUpdateCellPadding(column, event.target.value)}
                          />
                          <small>{section.cellPadding[column] ?? "18"}px</small>
                        </label>
                        <label className="field builder-cell-border-field">
                          <span>Border</span>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={section.cellBorderWidth[column] ?? "1"}
                            onChange={(event) => onUpdateCellBorderWidth(column, event.target.value)}
                          />
                          <small>{section.cellBorderWidth[column] ?? "1"}px</small>
                        </label>
                        <label className="field builder-cell-color-field">
                          <span>Border color</span>
                          <input
                            type="color"
                            value={section.cellBorderColor[column] ?? "#d9e4ef"}
                            onChange={(event) => onUpdateCellBorderColor(column, event.target.value)}
                          />
                        </label>
                        <label className="field builder-cell-radius-field">
                          <span>Radius</span>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={section.cellBorderRadius[column] ?? "24"}
                            onChange={(event) => onUpdateCellBorderRadius(column, event.target.value)}
                          />
                          <small>{section.cellBorderRadius[column] ?? "24"}px</small>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="builder-cell-panel">
                    <button
                      aria-expanded={!cellPanels.content}
                      className="builder-cell-panel-toggle"
                      onClick={() => toggleCellPanel(column, "content")}
                      type="button"
                    >
                      <strong>Content</strong>
                      <span>{cellPanels.content ? "▸" : "▾"}</span>
                    </button>

                    {!cellPanels.content ? (
                      <>
                        {columnModules.length === 0 ? (
                          <button
                            className="builder-column-empty-button"
                            onClick={() => onOpenModulePalette(column)}
                            type="button"
                          >
                            <span className="builder-column-empty-plus">+</span>
                          </button>
                        ) : (
                          <div className="builder-module-list">
                            {columnModules.map((module, moduleIndex) => (
                              <div
                                className="builder-module-stack-item"
                                draggable
                                key={module.id}
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData(
                                    "application/normie-builder-module",
                                    encodeDragPayload(module.id, column)
                                  );
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  event.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(event) => handleModuleDrop(event, column, module.id)}
                              >
                                <BuilderModuleCard
                                  module={module}
                                  sectionId={section.id}
                                  isExpanded={expandedModuleIds.includes(module.id)}
                                  onToggleExpanded={() => onToggleModuleExpanded(module.id)}
                                  onUpdateModule={(updater) => onUpdateModule(module.id, updater)}
                                  onUpdateModuleBackground={(updater) => onUpdateModuleBackground(module.id, updater)}
                                  onMoveUp={() => onMoveModule(module.id, -1)}
                                  onMoveDown={() => onMoveModule(module.id, 1)}
                                  onRemove={() => onRemoveModule(module.id)}
                                  onOpenGallery={() => onOpenGallery(module.id)}
                                  onUploadMedia={(file) => onUploadMediaForModule(module.id, file)}
                                />
                                {moduleIndex === columnModules.length - 1 ? (
                                  <button
                                    aria-label="Add module"
                                    className="builder-column-add-circle builder-column-add-button-inline"
                                    onClick={() => onOpenModulePalette(column)}
                                    type="button"
                                  >
                                    +
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </article>
  );
}
