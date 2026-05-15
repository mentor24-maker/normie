import type {
  BackgroundSettings,
  BuilderTemplateLayout,
  BuilderCellModuleRecord,
  BuilderProductRecord,
  BuilderTemplateModule,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import {
  createDefaultBackgroundSettings,
  getBuilderBackgroundStyle,
  getLayoutColumns,
  getLayoutGridTemplate
} from "@/lib/builder-template";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { BuilderModuleCard } from "./builder-module-card";
import { getAlignmentClass, getSectionBackgroundStyle, getVerticalMarginStyle } from "./builder-utils";
import { layoutOptions } from "./builder-types";

type BuilderSectionCardProps = {
  section: BuilderTemplateSection;
  sectionIndex: number;
  editorDevice: "browser" | "mobile";
  isCollapsed: boolean;
  expandedModuleIds: string[];
  onToggleCollapsed: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onCloneSection: () => void;
  onSaveSection: () => void;
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
  onCloneModule: (sectionId: string, moduleId: string) => void;
  onSaveModule: (moduleId: string) => void;
  cellModules: BuilderCellModuleRecord[];
  products: BuilderProductRecord[];
  onSaveCellModules: (column: string) => void;
  onInsertCellModule: (column: string, cellModuleId: string) => void;
  onInsertSavedModule: (column: string, cellModuleId: string) => void;
  onOpenGallery: (moduleId: string) => void;
  onOpenSocialIconGallery: (moduleId: string, itemId: string) => void;
  onUploadMediaForModule: (moduleId: string, file: File | null) => void;
  onOpenSectionBackgroundGallery: () => void;
  onUploadSectionBackgroundMedia: (file: File | null) => void;
  onOpenModulePalette: (column: string) => void;
};

export function BuilderSectionCard({
  section,
  sectionIndex,
  editorDevice,
  isCollapsed,
  expandedModuleIds,
  onToggleCollapsed,
  onMoveUp,
  onMoveDown,
  onRemove,
  onCloneSection,
  onSaveSection,
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
  onCloneModule,
  onSaveModule,
  cellModules,
  products,
  onSaveCellModules,
  onInsertCellModule,
  onInsertSavedModule,
  onOpenGallery,
  onOpenSocialIconGallery,
  onUploadMediaForModule,
  onOpenSectionBackgroundGallery,
  onUploadSectionBackgroundMedia,
  onOpenModulePalette
}: BuilderSectionCardProps) {
  const columns = getLayoutColumns(section.layout);
  const savedCells = cellModules.filter((cellModule) => cellModule.modules.length !== 1);
  const savedModules = cellModules.filter((cellModule) => cellModule.modules.length === 1);
  const [collapsedCellPanels, setCollapsedCellPanels] = useState<Record<string, { styles: boolean; content: boolean }>>({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const displayTitle = section.title?.trim() || `Section ${sectionIndex + 1}`;

  function handleTitleClick() {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

  function handleTitleBlur() {
    setIsEditingTitle(false);
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Escape") {
      setIsEditingTitle(false);
    }
  }

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

  function updateCellSetting(column: string, key: string, value: string) {
    onUpdateSection((current) => ({
      ...current,
      [`cell${key.charAt(0).toUpperCase()}${key.slice(1)}`]: {
        ...(current as unknown as Record<string, Record<string, string>>)[`cell${key.charAt(0).toUpperCase()}${key.slice(1)}`],
        [column]: value
      }
    }));
  }

  function getCellStyle(column: string): CSSProperties {
    const borderStyle = (section as unknown as Record<string, Record<string, string>>).cellBorderStyle?.[column] ?? "solid";
    const borderWidth = Number.parseInt(section.cellBorderWidth[column] ?? "1", 10);
    const borderRadius = Number.parseInt(section.cellBorderRadius[column] ?? "24", 10);
    const shadow = (section as unknown as Record<string, Record<string, string>>).cellShadow?.[column] ?? "none";
    const opacity = (section as unknown as Record<string, Record<string, string>>).cellOpacity?.[column];

    const shadowMap: Record<string, string> = {
      none: "none",
      light: "0 2px 8px rgba(0,0,0,0.08)",
      medium: "0 4px 16px rgba(0,0,0,0.14)",
      heavy: "0 8px 32px rgba(0,0,0,0.22)"
    };

    return {
      ...getBuilderBackgroundStyle(section.cellBackgrounds[column]),
      ...getVerticalMarginStyle(section.cellVerticalMargin?.[column] ?? "0"),
      padding: `${section.cellPadding[column] ?? "18"}px`,
      borderStyle: borderStyle === "none" ? "none" : borderStyle,
      borderWidth: borderStyle === "none" ? 0 : `${Math.max(Number.isFinite(borderWidth) ? borderWidth : 1, 0)}px`,
      borderColor: section.cellBorderColor[column] ?? "#d9e4ef",
      borderRadius: `${Math.max(Number.isFinite(borderRadius) ? borderRadius : 24, 0)}px`,
      boxShadow: shadowMap[shadow] ?? "none",
      opacity: opacity ? Number.parseFloat(opacity) : undefined,
      alignItems: (section as unknown as Record<string, Record<string, string>>).cellAlignItems?.[column] ?? undefined,
      justifyContent: (section as unknown as Record<string, Record<string, string>>).cellJustifyContent?.[column] ?? undefined
    };
  }

  function getSectionStyle(): CSSProperties {
    return {
      ...(getSectionBackgroundStyle(section) ?? {}),
      ...getVerticalMarginStyle(section.verticalMargin)
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
    if (!payload?.moduleId || !payload?.sourceSectionId) return;
    onDropModule(payload.moduleId, payload.sourceSectionId, section.id, targetColumn, targetBeforeModuleId);
  }

  function getCellExtra(column: string, key: string, fallback = "") {
    return (section as unknown as Record<string, Record<string, string>>)[key]?.[column] ?? fallback;
  }

  function setCellExtra(column: string, key: string, value: string) {
    onUpdateSection((current) => ({
      ...current,
      [key]: {
        ...((current as unknown as Record<string, Record<string, string>>)[key] ?? {}),
        [column]: value
      }
    }));
  }

  return (
    <article className="builder-section-card" style={getSectionStyle()}>
      <div className="builder-section-header">
        <div className="builder-section-title">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="builder-section-title-input"
              type="text"
              value={section.title ?? ""}
              onChange={(event) =>
                onUpdateSection((current) => ({ ...current, title: event.target.value }))
              }
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder={`Section ${sectionIndex + 1}`}
              autoFocus
            />
          ) : (
            <button
              className="builder-section-title-label"
              onClick={handleTitleClick}
              title="Click to rename"
              type="button"
            >
              <strong>{displayTitle}</strong>
              <span className="builder-section-title-edit-hint">✎</span>
            </button>
          )}
        </div>
        <div className="builder-section-actions">
          <button aria-label={isCollapsed ? "Expand section" : "Collapse section"} className="builder-icon-button" onClick={onToggleCollapsed} title={isCollapsed ? "Expand section" : "Collapse section"} type="button">{isCollapsed ? "▸" : "▾"}</button>
          <button aria-label="Move section up" className="builder-icon-button" onClick={onMoveUp} title="Move section up" type="button">↑</button>
          <button aria-label="Move section down" className="builder-icon-button" onClick={onMoveDown} title="Move section down" type="button">↓</button>
          <button aria-label="Clone section" className="builder-icon-button" onClick={onCloneSection} title="Clone section" type="button">⧉</button>
          <button aria-label="Save section" className="builder-icon-button" onClick={onSaveSection} title="Save section" type="button">💾</button>
          <button aria-label="Delete section" className="builder-icon-button builder-icon-button-danger" onClick={onRemove} title="Delete section" type="button">✕</button>
        </div>
      </div>

      {!isCollapsed ? (
        <>
          {editorDevice === "mobile" ? (
            <div className="builder-section-controls builder-section-controls-mobile">
              <label className="field">
                <span>Mobile layout</span>
                <select
                  value={section.mobileLayout ?? "stack"}
                  onChange={(event) =>
                    onUpdateSection((current) => ({
                      ...current,
                      mobileLayout: event.target.value as BuilderTemplateSection["mobileLayout"]
                    }))
                  }
                >
                  <option value="stack">Stack columns</option>
                  <option value="keep">Keep columns</option>
                  <option value="reverse-stack">Reverse stack</option>
                </select>
              </label>
              <div className="builder-mobile-context-note">
                Mobile mode only changes mobile-specific row, cell, and module overrides.
              </div>
            </div>
          ) : (
            <div className="builder-section-controls">
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
                        column: allowedColumns.has(module.column) ? module.column : getLayoutColumns(nextLayout)[0]
                      }))
                    }));
                  }}
                >
                  {layoutOptions.map((layout) => (
                    <option key={layout.value} value={layout.value}>{layout.label}</option>
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
              <label className="field">
                <span>Vertical margin</span>
                <input
                  type="range"
                  min="0"
                  max="160"
                  step="1"
                  value={section.verticalMargin ?? "0"}
                  onChange={(event) =>
                    onUpdateSection((current) => ({
                      ...current,
                      verticalMargin: event.target.value
                    }))
                  }
                />
                <small>{section.verticalMargin ?? "0"}px</small>
              </label>
              <BuilderBackgroundControls
                label="Row Background"
                background={section.background}
                compact
                onChange={(updater) => onUpdateSection((current) => ({ ...current, background: updater(current.background) }))}
                onChooseImage={onOpenSectionBackgroundGallery}
                onUploadImage={onUploadSectionBackgroundMedia}
              />
            </div>
          )}

          <div
            className={`builder-columns builder-columns-${columns.length} ${getAlignmentClass(section.alignment)}`}
            style={{ gridTemplateColumns: getLayoutGridTemplate(section.layout) }}
          >
            {columns.map((column) => {
              const columnModules = columnModuleMap[column] ?? [];
              const cellPanels = getCellPanelState(column);
              const borderStyle = getCellExtra(column, "cellBorderStyle", "solid");
              const shadow = getCellExtra(column, "cellShadow", "none");
              const opacity = getCellExtra(column, "cellOpacity", "1");
              const hAlign = getCellExtra(column, "cellHAlign", "left");
              const vAlign = getCellExtra(column, "cellVAlign", "top");

              return (
                <div
                  className="builder-column-card"
                  key={column}
                  style={getCellStyle(column)}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
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
                      <strong>{editorDevice === "mobile" ? "Mobile" : "Styles"}</strong>
                      <span>{cellPanels.styles ? "▸" : "▾"}</span>
                    </button>

                    {!cellPanels.styles ? editorDevice === "mobile" ? (
                      <div className="builder-cell-styles-grid builder-cell-styles-grid-mobile">
                        <div className="builder-cell-style-group">
                          <div className="builder-cell-style-group-label">Mobile display</div>
                          <label className="field builder-checkbox-field">
                            <span>Hide this cell on mobile</span>
                            <input
                              type="checkbox"
                              checked={getCellExtra(column, "cellMobileHidden", "false") === "true"}
                              onChange={(event) =>
                                setCellExtra(column, "cellMobileHidden", event.target.checked ? "true" : "false")
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="builder-cell-styles-grid">

                        {/* BORDER */}
                        <div className="builder-cell-style-group">
                          <div className="builder-cell-style-group-label">Border</div>
                          <label className="field">
                            <span>Style</span>
                            <select
                              value={borderStyle}
                              onChange={(e) => setCellExtra(column, "cellBorderStyle", e.target.value)}
                            >
                              <option value="none">None</option>
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                            </select>
                          </label>
                          {borderStyle !== "none" ? (
                            <>
                              <label className="field">
                                <span>Width</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="20"
                                  step="1"
                                  value={section.cellBorderWidth[column] ?? "1"}
                                  onChange={(e) => onUpdateCellBorderWidth(column, e.target.value)}
                                />
                                <small>{section.cellBorderWidth[column] ?? "1"}px</small>
                              </label>
                              <label className="field">
                                <span>Color</span>
                                <input
                                  type="color"
                                  value={section.cellBorderColor[column] ?? "#d9e4ef"}
                                  onChange={(e) => onUpdateCellBorderColor(column, e.target.value)}
                                />
                              </label>
                            </>
                          ) : null}
                          <label className="field">
                            <span>Radius</span>
                            <input
                              type="range"
                              min="0"
                              max="60"
                              step="1"
                              value={section.cellBorderRadius[column] ?? "24"}
                              onChange={(e) => onUpdateCellBorderRadius(column, e.target.value)}
                            />
                            <small>{section.cellBorderRadius[column] ?? "24"}px</small>
                          </label>
                          <label className="field">
                            <span>Shadow</span>
                            <select
                              value={shadow}
                              onChange={(e) => setCellExtra(column, "cellShadow", e.target.value)}
                            >
                              <option value="none">None</option>
                              <option value="light">Light</option>
                              <option value="medium">Medium</option>
                              <option value="heavy">Heavy</option>
                            </select>
                          </label>
                        </div>

                        {/* BACKGROUND */}
                        <div className="builder-cell-style-group">
                          <div className="builder-cell-style-group-label">Background</div>
                          <BuilderBackgroundControls
                            label=""
                            background={section.cellBackgrounds[column] ?? createDefaultBackgroundSettings()}
                            compact
                            onChange={(updater) => onUpdateCellBackground(column, updater)}
                          />
                          <label className="field">
                            <span>Opacity</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={opacity}
                              onChange={(e) => setCellExtra(column, "cellOpacity", e.target.value)}
                            />
                            <small>{Math.round(Number.parseFloat(opacity) * 100)}%</small>
                          </label>
                        </div>

                        {/* PADDING */}
                        <div className="builder-cell-style-group">
                          <div className="builder-cell-style-group-label">Padding</div>
                          <label className="field">
                            <span>Size</span>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="1"
                              value={section.cellPadding[column] ?? "18"}
                              onChange={(e) => onUpdateCellPadding(column, e.target.value)}
                            />
                            <small>{section.cellPadding[column] ?? "18"}px</small>
                          </label>
                          <label className="field">
                            <span>Vertical margin</span>
                            <input
                              type="range"
                              min="0"
                              max="160"
                              step="1"
                              value={getCellExtra(column, "cellVerticalMargin", "0")}
                              onChange={(e) => setCellExtra(column, "cellVerticalMargin", e.target.value)}
                            />
                            <small>{getCellExtra(column, "cellVerticalMargin", "0")}px</small>
                          </label>
                        </div>

                        {/* ALIGNMENT */}
                        <div className="builder-cell-style-group">
                          <div className="builder-cell-style-group-label">Alignment</div>
                          <label className="field">
                            <span>Horizontal</span>
                            <select
                              value={hAlign}
                              onChange={(e) => setCellExtra(column, "cellHAlign", e.target.value)}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Vertical</span>
                            <select
                              value={vAlign}
                              onChange={(e) => setCellExtra(column, "cellVAlign", e.target.value)}
                            >
                              <option value="top">Top</option>
                              <option value="center">Center</option>
                              <option value="bottom">Bottom</option>
                            </select>
                          </label>
                        </div>

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
                        <div className="builder-cell-repository-actions">
                          <button
                            className="secondary-button"
                            disabled={columnModules.length === 0}
                            onClick={() => onSaveCellModules(column)}
                            type="button"
                          >
                            Save cell
                          </button>
                          <label className="field builder-cell-repository-select">
                            <span>Insert saved cell</span>
                            <select
                              value=""
                              onChange={(event) => {
                                onInsertCellModule(column, event.target.value);
                                event.currentTarget.value = "";
                              }}
                            >
                              <option value="">Choose saved cell</option>
                              {savedCells.map((cellModule) => (
                                <option key={cellModule.id} value={cellModule.id}>
                                  {cellModule.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field builder-cell-repository-select">
                            <span>Insert saved module</span>
                            <select
                              value=""
                              onChange={(event) => {
                                onInsertSavedModule(column, event.target.value);
                                event.currentTarget.value = "";
                              }}
                            >
                              <option value="">Choose saved module</option>
                              {savedModules.map((cellModule) => (
                                <option key={cellModule.id} value={cellModule.id}>
                                  {cellModule.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {columnModules.length === 0 ? (
                          <button className="builder-column-empty-button" onClick={() => onOpenModulePalette(column)} type="button">
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
                                  event.dataTransfer.setData("application/normie-builder-module", encodeDragPayload(module.id, column));
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
                                  products={products}
                                  sectionId={section.id}
                                  editorDevice={editorDevice}
                                  isExpanded={expandedModuleIds.includes(module.id)}
                                  onToggleExpanded={() => onToggleModuleExpanded(module.id)}
                                  onUpdateModule={(updater) => onUpdateModule(module.id, updater)}
                                  onUpdateModuleBackground={(updater) => onUpdateModuleBackground(module.id, updater)}
                                  onMoveUp={() => onMoveModule(module.id, -1)}
                                  onMoveDown={() => onMoveModule(module.id, 1)}
                                  onRemove={() => onRemoveModule(module.id)}
                                  onClone={() => onCloneModule(section.id, module.id)}
                                  onSaveModule={() => onSaveModule(module.id)}
                                  onOpenGallery={() => onOpenGallery(module.id)}
                                  onOpenSocialIconGallery={(itemId) => onOpenSocialIconGallery(module.id, itemId)}
                                  onUploadMedia={(file) => onUploadMediaForModule(module.id, file)}
                                />
                                {moduleIndex === columnModules.length - 1 ? (
                                  <button aria-label="Add module" className="builder-column-add-circle builder-column-add-button-inline" onClick={() => onOpenModulePalette(column)} type="button">+</button>
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
