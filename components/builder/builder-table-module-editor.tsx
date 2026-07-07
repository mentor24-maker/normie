import { useRef, useState } from "react";

import type { BuilderTemplateModule } from "@/lib/builder-template";
import { createEmptyModule, normalizeBuilderAssetUrl } from "@/lib/builder-template";

import { BuilderCollapseIcon } from "./builder-collapse-icon";

import { BuilderRichTextEditor } from "@/components/builder-rich-text-editor";

import { modulePaletteGroups, modulePaletteItems } from "./builder-types";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";

import { BuilderHeadingModuleSettings } from "./builder-heading-module-settings";

import { BuilderSettingRow } from "./builder-setting-row";

import { BuilderInlineNumberSelect, BuilderInlineNumberSelectRow } from "./builder-inline-number-select";
import { cloneTableCellModule, parseTableData, serializeTableData, type ParsedTableData } from "./builder-module-items";
import { renderCompactCellModulePreview } from "./builder-module-preview";

export function TableCellInlinePalette({
  onSelect,
  onClose,
  position
}: {
  onSelect: (item: ModulePaletteItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}) {
  const [group, setGroup] = useState<ModulePaletteGroup | null>(null);
  const groups = modulePaletteGroups.filter((g) => g.value !== "table" && g.value !== "contact-form");
  const items = group ? modulePaletteItems.filter((item) => item.group === group) : [];

  return (
    <div
      className="builder-table-inline-palette"
      onClick={(e) => e.stopPropagation()}
      style={{ top: position.top, left: position.left }}
    >
      <div className="builder-table-palette-header">
        <strong>{group ? "Choose a module" : "Choose a group"}</strong>
        <button type="button" className="builder-icon-button" onClick={onClose}>✕</button>
      </div>
      {group ? (
        <>
          <div className="builder-table-palette-tabs">
            {groups.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`builder-table-palette-tab ${group === g.value ? "is-active" : ""}`}
                onClick={() => setGroup(g.value)}
              >
                {g.icon} {g.label}
              </button>
            ))}
          </div>
          <div className="builder-table-palette-items">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="builder-table-palette-item"
                onClick={() => onSelect(item)}
              >
                <span className="builder-module-item-icon">{item.icon}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="builder-table-palette-groups">
          {groups.map((g) => (
            <button
              key={g.value}
              type="button"
              className="builder-table-palette-group-btn"
              onClick={() => setGroup(g.value)}
            >
              <span className="builder-module-group-card-icon">{g.icon}</span>
              <strong>{g.label}</strong>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Table cell module list ---------- */

export function TableCellModules({
  cellKey,
  modules,
  onUpdate
}: {
  cellKey: string;
  modules: BuilderTemplateModule[];
  onUpdate: (cellKey: string, modules: BuilderTemplateModule[]) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [palettePos, setPalettePos] = useState({ top: 0, left: 0 });
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  function addModule(item: ModulePaletteItem) {
    const mod = createEmptyModule(item.type, "");
    const newMod = { ...mod, name: item.name, text: item.text, settings: { ...mod.settings, ...item.settings } };
    onUpdate(cellKey, [...modules, newMod]);
    setPaletteOpen(false);
  }

  function removeModule(id: string) {
    onUpdate(cellKey, modules.filter((m) => m.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function moveModule(id: string, direction: -1 | 1) {
    const index = modules.findIndex((m) => m.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= modules.length) return;
    const nextModules = [...modules];
    const [moved] = nextModules.splice(index, 1);
    nextModules.splice(targetIndex, 0, moved);
    onUpdate(cellKey, nextModules);
  }

  function updateModuleField(id: string, field: string, value: string) {
    onUpdate(cellKey, modules.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  function updateModuleSettings(id: string, updates: Record<string, string>) {
    onUpdate(
      cellKey,
      modules.map((m) =>
        m.id === id ? { ...m, settings: { ...m.settings, ...updates } } : m
      )
    );
  }

  return (
    <div className="builder-table-cell-modules" onClick={(e) => e.stopPropagation()}>
      {modules.map((mod) => (
        <div key={mod.id} className="builder-table-cell-module">
          <div className="builder-table-cell-module-header">
            <button
              aria-expanded={editingId === mod.id}
              type="button"
              className="builder-table-cell-module-toggle"
              onClick={() => setEditingId(editingId === mod.id ? null : mod.id)}
            >
              <span className="builder-table-cell-module-label">{mod.name || mod.type}</span>
              <span className="builder-collapse-chevron"><BuilderCollapseIcon expanded={editingId === mod.id} /></span>
            </button>
            <button type="button" className="builder-icon-button" onClick={() => moveModule(mod.id, -1)} title="Move up">↑</button>
            <button type="button" className="builder-icon-button" onClick={() => moveModule(mod.id, 1)} title="Move down">↓</button>
            <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeModule(mod.id)} title="Remove">✕</button>
          </div>
          {editingId !== mod.id ? renderCompactCellModulePreview(mod) : null}
          {editingId === mod.id && (
            <div className="builder-table-cell-module-editor">
              <label className="field">
                <span>Module label</span>
                <input type="text" value={mod.name} onChange={(e) => updateModuleField(mod.id, "name", e.target.value)} placeholder="Optional internal label" />
              </label>

              {mod.type === "heading" ? (
                <BuilderHeadingModuleSettings
                  compact
                  module={mod}
                  onUpdateModule={(updater) => {
                    onUpdate(cellKey, modules.map((item) => (item.id === mod.id ? updater(item) : item)));
                  }}
                />
              ) : null}

              {mod.type === "text" && (
                <label className="field">
                  <span>Content</span>
                  <BuilderRichTextEditor value={mod.text} onChange={(value) => updateModuleField(mod.id, "text", value)} />
                </label>
              )}

              {mod.type === "quote" && (
                <label className="field">
                  <span>Content</span>
                  <textarea className="builder-textarea" value={mod.text} onChange={(e) => updateModuleField(mod.id, "text", e.target.value)} placeholder="Enter content" rows={2} />
                </label>
              )}

              {mod.type === "button" && (
                <div className="builder-table-cell-button-settings">
                  <BuilderSettingRow label="Button label" fullWidth>
                    <input
                      type="text"
                      value={mod.text}
                      onChange={(e) => updateModuleField(mod.id, "text", e.target.value)}
                      placeholder="Button text"
                    />
                  </BuilderSettingRow>
                  <BuilderSettingRow label="Link" fullWidth>
                    <input
                      type="text"
                      value={mod.settings.href ?? ""}
                      onChange={(e) => updateModuleSettings(mod.id, { href: e.target.value })}
                      placeholder="/path-or-url"
                    />
                  </BuilderSettingRow>
                  <BuilderSettingRow label="Button color">
                    <input
                      type="color"
                      value={mod.settings.buttonColor ?? "#214c71"}
                      onChange={(e) => updateModuleSettings(mod.id, { buttonColor: e.target.value })}
                    />
                  </BuilderSettingRow>
                  <BuilderSettingRow label="Text color">
                    <input
                      type="color"
                      value={mod.settings.textColor ?? "#ffffff"}
                      onChange={(e) => updateModuleSettings(mod.id, { textColor: e.target.value })}
                    />
                  </BuilderSettingRow>
                </div>
              )}

              {mod.type === "image" && (
                <>
                  <label className="field">
                    <span>Media URL</span>
                    <input type="text" value={mod.settings.url ?? ""} onChange={(e) => updateModuleSettings(mod.id, { url: normalizeBuilderAssetUrl(e.target.value) })} placeholder="https://..." />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Alt text</span>
                      <input type="text" value={mod.settings.alt ?? ""} onChange={(e) => updateModuleSettings(mod.id, { alt: e.target.value })} placeholder="Image description" />
                    </label>
                    <label className="field">
                      <span>Size</span>
                      <select value={mod.settings.size ?? "100"} onChange={(e) => updateModuleSettings(mod.id, { size: e.target.value })}>
                        <option value="10">10%</option>
                        <option value="15">15%</option>
                        <option value="25">25%</option>
                        <option value="33">33%</option>
                        <option value="50">50%</option>
                        <option value="66">66%</option>
                        <option value="75">75%</option>
                        <option value="100">100%</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Border color</span>
                      <input type="color" value={mod.settings.borderColor ?? "#0f4f8f"} onChange={(e) => updateModuleSettings(mod.id, { borderColor: e.target.value })} />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="builder-table-cell-add-wrap">
        <button
          ref={(el) => { addBtnRef.current = el; }}
          type="button"
          className="builder-table-cell-add"
          onClick={(e) => {
            e.stopPropagation();
            if (!paletteOpen && addBtnRef.current) {
              const rect = addBtnRef.current.getBoundingClientRect();
              setPalettePos({ top: rect.bottom + 4, left: rect.left });
            }
            setPaletteOpen(!paletteOpen);
          }}
          title="Add module to this cell"
        >
          ⊕
        </button>
        {paletteOpen && (
          <TableCellInlinePalette
            onSelect={addModule}
            onClose={() => setPaletteOpen(false)}
            position={palettePos}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Table module editor ---------- */

export function TableModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const td = parseTableData(module.settings);
  const colCount = td.headers.length;

  function persist(newTd: ParsedTableData) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, tableData: serializeTableData(newTd) } }));
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function addColumn() {
    if (colCount >= 10) return;
    persist({ ...td, headers: [...td.headers, `Column ${colCount + 1}`] });
  }

  function removeColumn() {
    if (colCount <= 1) return;
    const newCells = { ...td.cells };
    for (let r = 0; r < td.rowCount; r++) delete newCells[`${r}-${colCount - 1}`];
    persist({ headers: td.headers.slice(0, -1), cells: newCells, rowCount: td.rowCount });
  }

  function addRow() {
    if (td.rowCount >= 100) return;
    persist({ ...td, rowCount: td.rowCount + 1 });
  }

  function cloneRow(rowIndex: number) {
    if (td.rowCount >= 100) return;

    const nextCells: ParsedTableData["cells"] = {};

    for (const [key, modules] of Object.entries(td.cells)) {
      const [rawRow, rawCol] = key.split("-");
      const sourceRow = Number.parseInt(rawRow, 10);

      if (!Number.isFinite(sourceRow)) {
        nextCells[key] = modules;
        continue;
      }

      if (sourceRow <= rowIndex) {
        nextCells[key] = modules;
      } else {
        nextCells[`${sourceRow + 1}-${rawCol}`] = modules;
      }
    }

    for (let col = 0; col < colCount; col++) {
      const sourceModules = td.cells[`${rowIndex}-${col}`] || [];
      nextCells[`${rowIndex + 1}-${col}`] = sourceModules.map((mod, moduleIndex) =>
        cloneTableCellModule(mod, `${rowIndex + 1}-${col}-${moduleIndex}`)
      );
    }

    persist({ ...td, cells: nextCells, rowCount: td.rowCount + 1 });
  }

  function removeRow() {
    if (td.rowCount <= 1) return;
    const newCells = { ...td.cells };
    for (let c = 0; c < colCount; c++) delete newCells[`${td.rowCount - 1}-${c}`];
    persist({ ...td, cells: newCells, rowCount: td.rowCount - 1 });
  }

  function updateHeader(index: number, value: string) {
    const newHeaders = [...td.headers];
    newHeaders[index] = value;
    persist({ ...td, headers: newHeaders });
  }

  function updateCellModules(cellKey: string, modules: BuilderTemplateModule[]) {
    persist({ ...td, cells: { ...td.cells, [cellKey]: modules } });
  }

  return (
    <>
      <div className="builder-table-design-grid">
        <BuilderInlineNumberSelectRow>
          <BuilderInlineNumberSelect
            label="Border width"
            value={module.settings.borderWidth ?? "1"}
            min={0}
            max={6}
            fallback="1"
            onChange={(value) => updateSetting("borderWidth", value)}
          />
          <BuilderInlineNumberSelect
            label="Cell padding"
            value={module.settings.cellPadding ?? "8"}
            min={2}
            max={24}
            fallback="8"
            onChange={(value) => updateSetting("cellPadding", value)}
          />
        </BuilderInlineNumberSelectRow>
        <label className="field"><span>Border color</span><input type="color" value={module.settings.borderColor ?? "#cccccc"} onChange={(e) => updateSetting("borderColor", e.target.value)} /></label>
        <label className="field"><span>Background</span><input type="color" value={module.settings.backgroundColor ?? "#ffffff"} onChange={(e) => updateSetting("backgroundColor", e.target.value)} /></label>
      </div>
      <div className="builder-table-structure-actions">
        <span>Columns: {colCount}</span>
        <button type="button" className="secondary-button" onClick={addColumn} disabled={colCount >= 10}>+ Col</button>
        <button type="button" className="secondary-button" onClick={removeColumn} disabled={colCount <= 1}>− Col</button>
        <span>Rows: {td.rowCount}</span>
        <button type="button" className="secondary-button" onClick={addRow} disabled={td.rowCount >= 100}>+ Row</button>
        <button type="button" className="secondary-button" onClick={removeRow} disabled={td.rowCount <= 1}>− Row</button>
      </div>
      <div className="builder-table-editor-scroll">
        <table className="builder-table-editor builder-table-editor-modules">
          <thead>
            <tr>
              <th className="builder-table-row-action-heading">Row</th>
              {td.headers.map((h, i) => (
                <th key={i}>
                  <input type="text" value={h} onChange={(e) => updateHeader(i, e.target.value)} placeholder={`Header ${i + 1}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: td.rowCount }, (_, ri) => (
              <tr key={ri}>
                <td className="builder-table-row-actions">
                  <button type="button" className="builder-icon-button" onClick={() => cloneRow(ri)} disabled={td.rowCount >= 100} title="Clone row">
                    ⧉
                  </button>
                </td>
                {td.headers.map((_, ci) => (
                  <td key={ci} className="builder-table-editor-cell">
                    <TableCellModules cellKey={`${ri}-${ci}`} modules={td.cells[`${ri}-${ci}`] || []} onUpdate={updateCellModules} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

