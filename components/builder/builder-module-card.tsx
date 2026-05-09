import Image from "next/image";
import { type CSSProperties, useRef, useState } from "react";
import type { BackgroundSettings, BuilderTemplateModule, BuilderTemplateModuleType } from "@/lib/builder-template";
import {
  createEmptyModule,
  getBuilderBackgroundStyle,
  normalizeBuilderAssetUrl,
  formatRichTextContent
} from "@/lib/builder-template";
import { BuilderRichTextEditor } from "@/components/builder-rich-text-editor";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { modulePaletteGroups, modulePaletteItems } from "./builder-types";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";
import {
  getAlignmentClass,
  getHeadingModuleStyle,
  getImageOverlayStyle,
  getImagePositionMode,
  getImageModuleStyle,
  getModuleAlignment,
  getModuleBackgroundSettings,
  isVideoMedia
} from "./builder-utils";

type BuilderModuleCardProps = {
  module: BuilderTemplateModule;
  sectionId: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateModuleBackground: (updater: (bg: BackgroundSettings) => BackgroundSettings) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onOpenGallery: () => void;
  onUploadMedia: (file: File | null) => void;
};

function renderModulePreview(module: BuilderTemplateModule) {
  const variant = module.settings.variant ?? "";

  if (module.type === "heading") {
    const Tag = (module.settings.level || "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

    return (
      <div className="builder-module-preview-copy">
        <Tag
          className={`builder-module-preview-heading builder-module-preview-heading-${variant || "default"}`}
          style={getHeadingModuleStyle(module.settings)}
        >
          {module.text || "Heading"}
        </Tag>
      </div>
    );
  }

  if (module.type === "quote") {
    return (
      <blockquote className={`builder-module-preview-quote builder-module-preview-quote-${variant || "default"}`}>
        {module.text || "Quote"}
      </blockquote>
    );
  }

  if (module.type === "button") {
    const s = module.settings;
    const btnStyle = {
      "--btn-bg": s.buttonColor || "#214c71",
      "--btn-bg-hover": s.buttonHoverColor || "#0f4f8f",
      "--btn-color": s.textColor || "#ffffff",
      "--btn-color-hover": s.textHoverColor || "#ffffff",
      "--btn-border": s.borderColor || "#214c71",
      padding: `${s.paddingY || "12"}px ${s.paddingX || "24"}px`
    } as CSSProperties;
    return (
      <div className="builder-module-preview-copy">
        <span
          className={`builder-preview-button builder-preview-button-styled builder-preview-button-${variant || "default"}`}
          style={btnStyle}
        >
          {module.text || "Button"}
        </span>
      </div>
    );
  }

  if (module.type === "image") {
    const mediaUrl = normalizeBuilderAssetUrl(module.settings.url);
    const imageStyle = getImageModuleStyle(module.settings);
    const imagePositionMode = getImagePositionMode(module.settings);
    const effectClass =
      module.settings.effect === "bounce"
        ? " normie-effect-bounce"
        : module.settings.effect === "spin"
        ? " normie-effect-spin"
        : module.settings.effect === "cruise"
        ? " normie-effect-cruise"
        : module.settings.effect === "tumbleweed"
        ? " normie-effect-tumbleweed"
        : "";

    return (
      <div
        className={`builder-module-preview-image-shell ${
          imagePositionMode === "overlay" ? "builder-module-preview-image-shell-overlay" : ""
        }`}
        style={imagePositionMode === "overlay" ? getImageOverlayStyle(module.settings) : undefined}
      >
        <figure
          className={`builder-preview-image builder-module-preview-image builder-module-preview-image-${variant || "default"}${effectClass}`}
          style={imageStyle}
        >
          {mediaUrl ? (
            isVideoMedia(mediaUrl) ? (
              <video className="builder-preview-video" controls preload="metadata" src={mediaUrl} />
            ) : (
              <div className="builder-preview-image-frame builder-module-preview-frame">
                <Image
                  alt={module.settings.alt || module.text || "Selected media"}
                  fill
                  sizes="(max-width: 900px) 100vw, 420px"
                  src={mediaUrl}
                  unoptimized
                />
              </div>
            )
          ) : (
            <div className="builder-module-preview-placeholder">Choose an image or video</div>
          )}
        </figure>
        {imagePositionMode === "overlay" ? <small className="builder-overlay-badge">Overlay mode</small> : null}
      </div>
    );
  }

  if (module.type === "table") {
    const td = parseTableData(module.settings);
    const borderW = Number.parseInt(module.settings.borderWidth || "1", 10);
    const borderC = module.settings.borderColor || "#cccccc";
    const cellPad = Number.parseInt(module.settings.cellPadding || "8", 10);
    const bgColor = module.settings.backgroundColor || "#ffffff";

    return (
      <div className="builder-module-preview-table-wrap">
        <table
          className="builder-module-preview-table"
          style={{
            borderCollapse: "collapse",
            width: "100%",
            border: `${borderW}px solid ${borderC}`,
            background: bgColor
          }}
        >
          {td.headers.length > 0 && (
            <thead>
              <tr>
                {td.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      border: `${borderW}px solid ${borderC}`,
                      padding: `${cellPad}px`,
                      textAlign: "left",
                      fontWeight: 600
                    }}
                  >
                    {h || "\u00A0"}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: td.rowCount }, (_, ri) => (
              <tr key={ri}>
                {td.headers.map((_, ci) => {
                  const cellMods = td.cells[`${ri}-${ci}`] || [];
                  return (
                    <td
                      key={ci}
                      style={{
                        border: `${borderW}px solid ${borderC}`,
                        padding: `${cellPad}px`,
                        verticalAlign: "top"
                      }}
                    >
                      {cellMods.length > 0
                        ? cellMods.map((m) => (
                            <div key={m.id} className="builder-table-cell-module-label">
                              {m.name || m.type}
                            </div>
                          ))
                        : "\u00A0"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (module.type === "slider") {
    const items = parseSliderItems(module.settings);
    const gap = Number.parseInt(module.settings.sliderGap || "16", 10);
    const cardWidth = Number.parseInt(module.settings.sliderCardWidth || "280", 10);

    return (
      <div className="builder-module-preview-slider" style={{ gap: `${gap}px` }}>
        {items.length > 0 ? (
          items.map((item) => (
            <article
              key={item.id}
              className="builder-module-preview-slider-card"
              style={{ minWidth: `${cardWidth}px` }}
            >
              {item.imageUrl ? (
                <div className="builder-module-preview-slider-image">
                  <Image
                    alt={item.title || "Slider item"}
                    fill
                    sizes="220px"
                    src={item.imageUrl}
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="builder-module-preview-slider-copy">
                <strong>{item.title || "Slide title"}</strong>
                <p>{item.body || "Slide body"}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="builder-module-preview-placeholder">Add slider items</div>
        )}
      </div>
    );
  }

  if (module.type === "social") {
    const items = parseSocialItems(module.settings);
    const gap = Number.parseInt(module.settings.socialGap || "14", 10);
    const iconSize = Number.parseInt(module.settings.socialIconSize || "44", 10) * 2;
    const showLabels = module.settings.socialShowLabels !== "false";

    return (
      <div className="builder-module-preview-social" style={{ gap: `${gap}px` }}>
        {items.length > 0 ? (
          items.map((item) => (
            <a key={item.id} className="builder-module-preview-social-item" href={item.href || "#"}>
              <span className="builder-module-preview-social-icon" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                {item.iconUrl ? (
                  <Image alt={item.label || "Social icon"} fill sizes={`${iconSize}px`} src={item.iconUrl} unoptimized />
                ) : (
                  <span>{item.label.slice(0, 1) || "@"}</span>
                )}
              </span>
              {showLabels ? <span>{item.label || "Social"}</span> : null}
            </a>
          ))
        ) : (
          <div className="builder-module-preview-placeholder">Add social icons</div>
        )}
      </div>
    );
  }

  if (module.type === "previous-results") {
    return (
      <article className="panel result-panel builder-module-preview-poll">
        <div className="panel-label">Previous Results</div>
        <h2>Live result bars from the previous community poll.</h2>
        <p className="panel-copy">
          This module renders the real previous-poll results in page preview and on the live site.
        </p>
        <div className="result-list">
          <div className="result-row">
            <div className="result-meta">
              <span>Option A</span>
              <span>124 · 62%</span>
            </div>
            <div className="result-bar">
              <div className="result-bar-fill" style={{ width: "62%" }} />
            </div>
          </div>
          <div className="result-row">
            <div className="result-meta">
              <span>Option B</span>
              <span>76 · 38%</span>
            </div>
            <div className="result-bar">
              <div className="result-bar-fill" style={{ width: "38%" }} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (module.type === "current-poll") {
    return (
      <article className="panel action-panel builder-module-preview-poll">
        <div className="panel-label">Current Poll</div>
        <h2>Live current poll prompt with answer choices.</h2>
        <div className="option-list">
          <div className="option-button">Option One</div>
          <div className="option-button">Option Two</div>
        </div>
        <p className="panel-copy">
          This module uses the real live poll and vote flow in page preview and on the live site.
        </p>
      </article>
    );
  }

  return (
    <div
      className={`builder-module-preview-paragraph builder-module-preview-text-${variant || "default"}`}
      dangerouslySetInnerHTML={{ __html: formatRichTextContent(module.text) || "<p>Text block</p>" }}
    />
  );
}

type ParsedTableData = {
  headers: string[];
  cells: Record<string, BuilderTemplateModule[]>;
  rowCount: number;
};

type SliderItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

type SocialItem = {
  id: string;
  label: string;
  href: string;
  iconUrl: string;
};

function renderCompactCellModulePreview(module: BuilderTemplateModule) {
  return <div className="builder-table-cell-module-preview">{renderModulePreview(module)}</div>;
}

function parseSliderItems(settings: Record<string, string>): SliderItem[] {
  try {
    const items = JSON.parse(settings.sliderItems || "[]");

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        id: String(raw.id || `slide-${index + 1}`),
        title: String(raw.title || ""),
        body: String(raw.body || ""),
        imageUrl: normalizeBuilderAssetUrl(raw.imageUrl),
        linkUrl: String(raw.linkUrl || "")
      };
    });
  } catch {
    return [];
  }
}

function serializeSliderItems(items: SliderItem[]) {
  return JSON.stringify(items);
}

function parseSocialItems(settings: Record<string, string>): SocialItem[] {
  try {
    const items = JSON.parse(settings.socialItems || "[]");

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        id: String(raw.id || `social-${index + 1}`),
        label: String(raw.label || ""),
        href: String(raw.href || ""),
        iconUrl: normalizeBuilderAssetUrl(raw.iconUrl)
      };
    });
  } catch {
    return [];
  }
}

function serializeSocialItems(items: SocialItem[]) {
  return JSON.stringify(items);
}

function parseTableData(settings: Record<string, string>): ParsedTableData {
  try {
    const data = JSON.parse(settings.tableData || "{}");
    const headers: string[] = Array.isArray(data.headers) ? data.headers : [];

    // New format: cells + rowCount
    if (data.cells && typeof data.rowCount === "number") {
      const cells: Record<string, BuilderTemplateModule[]> = {};
      for (const [key, mods] of Object.entries(data.cells)) {
        cells[key] = Array.isArray(mods) ? (mods as BuilderTemplateModule[]) : [];
      }
      return { headers, cells, rowCount: data.rowCount };
    }

    // Legacy migration: rows of plain strings → cells with text modules
    if (Array.isArray(data.rows)) {
      const cells: Record<string, BuilderTemplateModule[]> = {};
      for (let ri = 0; ri < data.rows.length; ri++) {
        const row = data.rows[ri];
        if (!Array.isArray(row)) continue;
        for (let ci = 0; ci < row.length; ci++) {
          const text = String(row[ci] || "");
          if (text) {
            const mod = createEmptyModule("text", "");
            mod.text = text;
            mod.name = "Text";
            cells[`${ri}-${ci}`] = [mod];
          }
        }
      }
      return { headers, cells, rowCount: data.rows.length };
    }

    return { headers, cells: {}, rowCount: Math.max(Number(data.rowCount) || 0, 1) };
  } catch {
    return { headers: [], cells: {}, rowCount: 1 };
  }
}

function serializeTableData(td: ParsedTableData): string {
  return JSON.stringify({ headers: td.headers, cells: td.cells, rowCount: td.rowCount });
}

/* ---------- Inline palette for table cells ---------- */

function TableCellInlinePalette({
  onSelect,
  onClose,
  position
}: {
  onSelect: (item: ModulePaletteItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}) {
  const [group, setGroup] = useState<ModulePaletteGroup | null>(null);

  // Exclude table type to prevent nesting
  const groups = modulePaletteGroups.filter((g) => g.value !== "table");
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

function TableCellModules({
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

    if (index < 0 || targetIndex < 0 || targetIndex >= modules.length) {
      return;
    }

    const nextModules = [...modules];
    const [moved] = nextModules.splice(index, 1);
    nextModules.splice(targetIndex, 0, moved);
    onUpdate(cellKey, nextModules);
  }

  function updateModuleField(id: string, field: string, value: string) {
    onUpdate(
      cellKey,
      modules.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  function updateModuleSettings(id: string, updates: Record<string, string>) {
    onUpdate(
      cellKey,
      modules.map((m) =>
        m.id === id
          ? {
              ...m,
              settings: {
                ...m.settings,
                ...updates
              }
            }
          : m
      )
    );
  }

  return (
    <div className="builder-table-cell-modules" onClick={(e) => e.stopPropagation()}>
      {modules.map((mod) => (
        <div key={mod.id} className="builder-table-cell-module">
          <div className="builder-table-cell-module-header">
            <button
              type="button"
              className="builder-table-cell-module-toggle"
              onClick={() => setEditingId(editingId === mod.id ? null : mod.id)}
            >
              <span className="builder-table-cell-module-label">{mod.name || mod.type}</span>
              <span>{editingId === mod.id ? "▾" : "▸"}</span>
            </button>
            <button
              type="button"
              className="builder-icon-button"
              onClick={() => moveModule(mod.id, -1)}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="builder-icon-button"
              onClick={() => moveModule(mod.id, 1)}
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="builder-icon-button builder-icon-button-danger"
              onClick={() => removeModule(mod.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
          {editingId !== mod.id ? renderCompactCellModulePreview(mod) : null}
          {editingId === mod.id && (
            <div className="builder-table-cell-module-editor">
              <label className="field">
                <span>Module label</span>
                <input
                  type="text"
                  value={mod.name}
                  onChange={(e) => updateModuleField(mod.id, "name", e.target.value)}
                  placeholder="Optional internal label"
                />
              </label>

              {mod.type === "heading" && (
                <>
                  <label className="field">
                    <span>Heading text</span>
                    <input
                      type="text"
                      value={mod.text}
                      onChange={(e) => updateModuleField(mod.id, "text", e.target.value)}
                      placeholder="Enter heading"
                    />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Level</span>
                      <select
                        value={mod.settings.level ?? "h2"}
                        onChange={(e) => updateModuleSettings(mod.id, { level: e.target.value })}
                      >
                        <option value="h1">H1</option>
                        <option value="h2">H2</option>
                        <option value="h3">H3</option>
                        <option value="h4">H4</option>
                        <option value="h5">H5</option>
                        <option value="h6">H6</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Size</span>
                      <input
                        type="number"
                        min="10"
                        max="160"
                        step="1"
                        value={mod.settings.fontSize ?? "32"}
                        onChange={(e) => updateModuleSettings(mod.id, { fontSize: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Color</span>
                      <input
                        type="color"
                        value={mod.settings.color ?? "#18324a"}
                        onChange={(e) => updateModuleSettings(mod.id, { color: e.target.value })}
                      />
                    </label>
                  </div>
                </>
              )}

              {mod.type === "text" && (
                <label className="field">
                  <span>Content</span>
                  <BuilderRichTextEditor
                    value={mod.text}
                    onChange={(value) => updateModuleField(mod.id, "text", value)}
                  />
                </label>
              )}

              {mod.type === "quote" && (
                <label className="field">
                  <span>Content</span>
                  <textarea
                    className="builder-textarea"
                    value={mod.text}
                    onChange={(e) => updateModuleField(mod.id, "text", e.target.value)}
                    placeholder="Enter content"
                    rows={2}
                  />
                </label>
              )}

              {mod.type === "button" && (
                <>
                  <label className="field">
                    <span>Button label</span>
                    <input
                      type="text"
                      value={mod.text}
                      onChange={(e) => updateModuleField(mod.id, "text", e.target.value)}
                      placeholder="Button text"
                    />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Link</span>
                      <input
                        type="text"
                        value={mod.settings.href ?? ""}
                        onChange={(e) => updateModuleSettings(mod.id, { href: e.target.value })}
                        placeholder="/path-or-url"
                      />
                    </label>
                    <label className="field">
                      <span>Button color</span>
                      <input
                        type="color"
                        value={mod.settings.buttonColor ?? "#214c71"}
                        onChange={(e) => updateModuleSettings(mod.id, { buttonColor: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Text color</span>
                      <input
                        type="color"
                        value={mod.settings.textColor ?? "#ffffff"}
                        onChange={(e) => updateModuleSettings(mod.id, { textColor: e.target.value })}
                      />
                    </label>
                  </div>
                </>
              )}

              {mod.type === "image" && (
                <>
                  <label className="field">
                    <span>Media URL</span>
                    <input
                      type="text"
                      value={mod.settings.url ?? ""}
                      onChange={(e) =>
                        updateModuleSettings(mod.id, { url: normalizeBuilderAssetUrl(e.target.value) })
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Alt text</span>
                      <input
                        type="text"
                        value={mod.settings.alt ?? ""}
                        onChange={(e) => updateModuleSettings(mod.id, { alt: e.target.value })}
                        placeholder="Image description"
                      />
                    </label>
                    <label className="field">
                      <span>Size</span>
                      <select
                        value={mod.settings.size ?? "100"}
                        onChange={(e) => updateModuleSettings(mod.id, { size: e.target.value })}
                      >
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
                      <input
                        type="color"
                        value={mod.settings.borderColor ?? "#0f4f8f"}
                        onChange={(e) => updateModuleSettings(mod.id, { borderColor: e.target.value })}
                      />
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

function TableModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const td = parseTableData(module.settings);
  const colCount = td.headers.length;

  function persist(newTd: ParsedTableData) {
    onUpdateModule((current) => ({
      ...current,
      settings: { ...current.settings, tableData: serializeTableData(newTd) }
    }));
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value }
    }));
  }

  function addColumn() {
    if (colCount >= 10) return;
    persist({ ...td, headers: [...td.headers, `Column ${colCount + 1}`] });
  }

  function removeColumn() {
    if (colCount <= 1) return;
    const newCells = { ...td.cells };
    for (let r = 0; r < td.rowCount; r++) {
      delete newCells[`${r}-${colCount - 1}`];
    }
    persist({ headers: td.headers.slice(0, -1), cells: newCells, rowCount: td.rowCount });
  }

  function addRow() {
    if (td.rowCount >= 100) return;
    persist({ ...td, rowCount: td.rowCount + 1 });
  }

  function removeRow() {
    if (td.rowCount <= 1) return;
    const newCells = { ...td.cells };
    for (let c = 0; c < colCount; c++) {
      delete newCells[`${td.rowCount - 1}-${c}`];
    }
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
        <label className="field">
          <span>Border width</span>
          <input type="range" min="0" max="6" step="1" value={module.settings.borderWidth ?? "1"} onChange={(e) => updateSetting("borderWidth", e.target.value)} />
        </label>
        <label className="field">
          <span>Border color</span>
          <input type="color" value={module.settings.borderColor ?? "#cccccc"} onChange={(e) => updateSetting("borderColor", e.target.value)} />
        </label>
        <label className="field">
          <span>Cell padding</span>
          <input type="range" min="2" max="24" step="1" value={module.settings.cellPadding ?? "8"} onChange={(e) => updateSetting("cellPadding", e.target.value)} />
        </label>
        <label className="field">
          <span>Background</span>
          <input type="color" value={module.settings.backgroundColor ?? "#ffffff"} onChange={(e) => updateSetting("backgroundColor", e.target.value)} />
        </label>
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
              {td.headers.map((h, i) => (
                <th key={i}>
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    placeholder={`Header ${i + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: td.rowCount }, (_, ri) => (
              <tr key={ri}>
                {td.headers.map((_, ci) => (
                  <td key={ci} className="builder-table-editor-cell">
                    <TableCellModules
                      cellKey={`${ri}-${ci}`}
                      modules={td.cells[`${ri}-${ci}`] || []}
                      onUpdate={updateCellModules}
                    />
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

function SliderModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseSliderItems(module.settings);

  function persist(nextItems: SliderItem[]) {
    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        sliderItems: serializeSliderItems(nextItems)
      }
    }));
  }

  function updateItem(id: string, updates: Partial<SliderItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) {
    persist(items.filter((item) => item.id !== id));
  }

  function addItem() {
    persist([
      ...items,
      {
        id: `slide-${Date.now()}-${items.length + 1}`,
        title: "",
        body: "",
        imageUrl: "",
        linkUrl: ""
      }
    ]);
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field">
          <span>Card width</span>
          <input
            type="range"
            min="180"
            max="420"
            step="10"
            value={module.settings.sliderCardWidth ?? "280"}
            onChange={(e) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, sliderCardWidth: e.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Gap</span>
          <input
            type="range"
            min="8"
            max="40"
            step="2"
            value={module.settings.sliderGap ?? "16"}
            onChange={(e) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, sliderGap: e.target.value }
              }))
            }
          />
        </label>
      </div>

      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.title || `Slide ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">
                  ↑
                </button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">
                  ↓
                </button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete slide">
                  ✕
                </button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field">
                <span>Title</span>
                <input type="text" value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} />
              </label>
              <label className="field">
                <span>Link</span>
                <input type="text" value={item.linkUrl} onChange={(e) => updateItem(item.id, { linkUrl: e.target.value })} placeholder="/path-or-url" />
              </label>
              <label className="field builder-slider-item-grid-full">
                <span>Image URL</span>
                <input
                  type="text"
                  value={item.imageUrl}
                  onChange={(e) => updateItem(item.id, { imageUrl: normalizeBuilderAssetUrl(e.target.value) })}
                  placeholder="https://..."
                />
              </label>
              <label className="field builder-slider-item-grid-full">
                <span>Description</span>
                <textarea
                  className="builder-textarea"
                  rows={3}
                  value={item.body}
                  onChange={(e) => updateItem(item.id, { body: e.target.value })}
                  placeholder="Add copy for this slide"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="secondary-button" onClick={addItem}>
        Add Slide
      </button>
    </>
  );
}

function SocialModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseSocialItems(module.settings);

  function persist(nextItems: SocialItem[]) {
    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        socialItems: serializeSocialItems(nextItems)
      }
    }));
  }

  function updateItem(id: string, updates: Partial<SocialItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) {
    persist(items.filter((item) => item.id !== id));
  }

  function addItem() {
    persist([
      ...items,
      {
        id: `social-${Date.now()}-${items.length + 1}`,
        label: "",
        href: "",
        iconUrl: ""
      }
    ]);
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field">
          <span>Icon size</span>
          <input
            type="range"
            min="24"
            max="84"
            step="2"
            value={module.settings.socialIconSize ?? "44"}
            onChange={(e) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, socialIconSize: e.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Gap</span>
          <input
            type="range"
            min="6"
            max="32"
            step="2"
            value={module.settings.socialGap ?? "14"}
            onChange={(e) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, socialGap: e.target.value }
              }))
            }
          />
        </label>
        <label className="field builder-checkbox-field">
          <span>Show labels</span>
          <input
            type="checkbox"
            checked={module.settings.socialShowLabels !== "false"}
            onChange={(e) =>
              onUpdateModule((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  socialShowLabels: e.target.checked ? "true" : "false"
                }
              }))
            }
          />
        </label>
      </div>

      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.label || `Network ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">
                  ↑
                </button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">
                  ↓
                </button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete icon">
                  ✕
                </button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field">
                <span>Label</span>
                <input type="text" value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} />
              </label>
              <label className="field">
                <span>Link</span>
                <input type="text" value={item.href} onChange={(e) => updateItem(item.id, { href: e.target.value })} placeholder="https://..." />
              </label>
              <label className="field builder-slider-item-grid-full">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={item.iconUrl}
                  onChange={(e) => updateItem(item.id, { iconUrl: normalizeBuilderAssetUrl(e.target.value) })}
                  placeholder="/api/admin/media-file/gallery/social-x.svg"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="secondary-button" onClick={addItem}>
        Add Social Icon
      </button>
    </>
  );
}

export function BuilderModuleCard({
  module,
  sectionId,
  isExpanded,
  onToggleExpanded,
  onUpdateModule,
  onUpdateModuleBackground,
  onMoveUp,
  onMoveDown,
  onRemove,
  onOpenGallery,
  onUploadMedia
}: BuilderModuleCardProps) {
  const moduleAlignment = getModuleAlignment(module.settings);

  return (
    <div
      className={`builder-module-card ${getAlignmentClass(moduleAlignment)}`}
      style={getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings))}
    >
      <div className="builder-module-header">
        <div className="builder-module-title">
          <strong>{module.name || module.type}</strong>
          <span>{module.type}</span>
        </div>
        <div className="builder-section-actions">
          <button
            aria-label={isExpanded ? "Collapse module" : "Expand module"}
            className="builder-icon-button"
            onClick={onToggleExpanded}
            title={isExpanded ? "Collapse module" : "Expand module"}
            type="button"
          >
            {isExpanded ? "▾" : "▸"}
          </button>
          <button
            aria-label="Move module up"
            className="builder-icon-button"
            onClick={onMoveUp}
            title="Move module up"
            type="button"
          >
            ↑
          </button>
          <button
            aria-label="Move module down"
            className="builder-icon-button"
            onClick={onMoveDown}
            title="Move module down"
            type="button"
          >
            ↓
          </button>
          <button
            aria-label="Delete module"
            className="builder-icon-button builder-icon-button-danger"
            onClick={onRemove}
            title="Delete module"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {!isExpanded ? (
        <button
          className="builder-module-preview-button"
          onClick={onToggleExpanded}
          type="button"
        >
          {renderModulePreview(module)}
        </button>
      ) : null}

      {isExpanded ? (
        <div className="builder-module-editor">
          <div className="builder-module-header">
            <strong>Edit module</strong>
            <span className="builder-module-editor-copy">These controls stay available from the module header.</span>
          </div>

          <label className="field">
            <span>Module label</span>
            <input
              type="text"
              value={module.name}
              onChange={(event) =>
                onUpdateModule((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Optional internal label"
            />
          </label>

          <div className="builder-module-settings-row">
            <BuilderBackgroundControls
              label="Module Background"
              background={getModuleBackgroundSettings(module.settings)}
              compact
              onChange={onUpdateModuleBackground}
            />

            <div className="builder-module-alignment-controls">
              <span>Alignment</span>
              <div className="builder-alignment-icon-group" role="group" aria-label="Module alignment">
                {([
                  { value: "left", label: "Align left", icon: "≡" },
                  { value: "center", label: "Align center", icon: "≣" },
                  { value: "right", label: "Align right", icon: "☰" }
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    aria-label={option.label}
                    className={
                      option.value === moduleAlignment
                        ? "builder-icon-button builder-icon-button-active"
                        : "builder-icon-button"
                    }
                    onClick={() =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          alignment: option.value
                        }
                      }))
                    }
                    title={option.label}
                    type="button"
                  >
                    {option.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(module.type === "image" || module.type === "button") && (
            <label className="field">
              <span>{module.type === "image" ? "URL" : "Link"}</span>
              <input
                type="text"
                value={module.settings[module.type === "image" ? "url" : "href"] ?? ""}
                onChange={(event) =>
                  onUpdateModule((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      [module.type === "image" ? "url" : "href"]:
                        module.type === "image"
                          ? normalizeBuilderAssetUrl(event.target.value)
                          : event.target.value
                    }
                  }))
                }
                placeholder={module.type === "image" ? "https://..." : "/path-or-url"}
              />
            </label>
          )}

          {module.type === "button" && (
            <div className="builder-button-design-grid">
              <label className="field">
                <span>Button color</span>
                <input
                  type="color"
                  value={module.settings.buttonColor ?? "#214c71"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, buttonColor: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>Hover color</span>
                <input
                  type="color"
                  value={module.settings.buttonHoverColor ?? "#0f4f8f"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, buttonHoverColor: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>Text color</span>
                <input
                  type="color"
                  value={module.settings.textColor ?? "#ffffff"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, textColor: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>Text hover</span>
                <input
                  type="color"
                  value={module.settings.textHoverColor ?? "#ffffff"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, textHoverColor: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>Border color</span>
                <input
                  type="color"
                  value={module.settings.borderColor ?? "#214c71"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, borderColor: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>H padding</span>
                <input
                  type="range"
                  min="4"
                  max="60"
                  step="2"
                  value={module.settings.paddingX ?? "24"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, paddingX: e.target.value } }))
                  }
                />
              </label>
              <label className="field">
                <span>V padding</span>
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="2"
                  value={module.settings.paddingY ?? "12"}
                  onChange={(e) =>
                    onUpdateModule((c) => ({ ...c, settings: { ...c.settings, paddingY: e.target.value } }))
                  }
                />
              </label>
            </div>
          )}

          {module.type === "image" ? (
            <div className="builder-media-actions">
              <button
                className="secondary-button builder-gallery-button"
                onClick={onOpenGallery}
                type="button"
              >
                Choose From Gallery
              </button>
              <label className="secondary-button builder-gallery-button builder-upload-button">
                <span>Upload To Gallery</span>
                <input
                  className="builder-upload-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    onUploadMedia(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          ) : null}

          {module.type === "image" && (
            <>
              <label className="field">
                <span>Alt text</span>
                <input
                  type="text"
                  value={module.settings.alt ?? ""}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        alt: event.target.value
                      }
                    }))
                  }
                  placeholder="Image description"
                />
              </label>
              <div className="builder-image-controls-grid">
                <label className="field">
                  <span>Size</span>
                  <select
                    value={module.settings.size ?? "100"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          size: event.target.value
                        }
                      }))
                    }
                  >
                    <option value="25">25%</option>
                    <option value="33">33%</option>
                    <option value="50">50%</option>
                    <option value="66">66%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </select>
                </label>
                <label className="field">
                  <span>Position</span>
                  <select
                    value={module.settings.positionMode ?? "inline"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          positionMode: event.target.value
                        }
                      }))
                    }
                  >
                    <option value="inline">Inline</option>
                    <option value="overlay">Overlay</option>
                  </select>
                </label>
                <label className="field">
                  <span>Border thickness</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={module.settings.borderThickness ?? "0"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          borderThickness: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Border color</span>
                  <input
                    type="color"
                    value={module.settings.borderColor ?? "#0f4f8f"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          borderColor: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Border radius</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={module.settings.borderRadius ?? "18"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          borderRadius: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Effect</span>
                  <select
                    value={module.settings.effect ?? "none"}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          effect: event.target.value
                        }
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="bounce">Bounce</option>
                    <option value="spin">Spin</option>
                    <option value="cruise">Cruise</option>
                    <option value="tumbleweed">Tumbleweed</option>
                  </select>
                </label>
              </div>
              {module.settings.positionMode === "overlay" ? (
                <div className="builder-image-controls-grid">
                  <label className="field">
                    <span>Anchor</span>
                    <select
                      value={module.settings.overlayAnchor ?? "center"}
                      onChange={(event) =>
                        onUpdateModule((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            overlayAnchor: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top left</option>
                      <option value="top-center">Top center</option>
                      <option value="top-right">Top right</option>
                      <option value="center-left">Center left</option>
                      <option value="center-right">Center right</option>
                      <option value="bottom-left">Bottom left</option>
                      <option value="bottom-center">Bottom center</option>
                      <option value="bottom-right">Bottom right</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>X offset</span>
                    <input
                      type="number"
                      value={module.settings.offsetX ?? "0"}
                      onChange={(event) =>
                        onUpdateModule((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            offsetX: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Y offset</span>
                    <input
                      type="number"
                      value={module.settings.offsetY ?? "0"}
                      onChange={(event) =>
                        onUpdateModule((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            offsetY: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Z index</span>
                    <select
                      value={module.settings.zIndex ?? "2"}
                      onChange={(event) =>
                        onUpdateModule((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            zIndex: event.target.value
                          }
                        }))
                      }
                    >
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          )}

          {module.type === "heading" ? (
            <div className="builder-typography-controls-grid">
              <label className="field">
                <span>Level</span>
                <select
                  value={module.settings.level ?? "h2"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        level: event.target.value
                      }
                    }))
                  }
                >
                  <option value="h1">H1</option>
                  <option value="h2">H2</option>
                  <option value="h3">H3</option>
                  <option value="h4">H4</option>
                  <option value="h5">H5</option>
                  <option value="h6">H6</option>
                </select>
              </label>
              <label className="field">
                <span>Size (px)</span>
                <input
                  type="number"
                  min="10"
                  max="160"
                  step="1"
                  value={module.settings.fontSize ?? "32"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        fontSize: event.target.value
                      }
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Color</span>
                <input
                  type="color"
                  value={module.settings.color ?? "#18324a"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        color: event.target.value
                      }
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Bold</span>
                <select
                  value={module.settings.bold ?? "true"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        bold: event.target.value
                      }
                    }))
                  }
                >
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              </label>
              <label className="field">
                <span>Italic</span>
                <select
                  value={module.settings.italic ?? "false"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        italic: event.target.value
                      }
                    }))
                  }
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
              <label className="field">
                <span>Underline</span>
                <select
                  value={module.settings.underline ?? "false"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        underline: event.target.value
                      }
                    }))
                  }
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
              <label className="field">
                <span>Drop shadow</span>
                <select
                  value={module.settings.dropShadow ?? "false"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        dropShadow: event.target.value
                      }
                    }))
                  }
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
              <label className="field">
                <span>Outline</span>
                <select
                  value={module.settings.outline ?? "false"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        outline: event.target.value
                      }
                    }))
                  }
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
            </div>
          ) : null}

          {module.type === "table" && (
            <TableModuleEditor module={module} onUpdateModule={onUpdateModule} />
          )}

          {module.type === "slider" && (
            <SliderModuleEditor module={module} onUpdateModule={onUpdateModule} />
          )}

          {module.type === "social" && (
            <SocialModuleEditor module={module} onUpdateModule={onUpdateModule} />
          )}

          {(module.type === "previous-results" || module.type === "current-poll") && (
            <div className="builder-module-runtime-note">
              <strong>Live poll module</strong>
              <p>
                This module uses the same live poll data and interactions as the homepage. Use page
                preview or a live page to test the real behavior.
              </p>
            </div>
          )}

          {module.type !== "image" &&
          module.type !== "table" &&
          module.type !== "slider" &&
          module.type !== "social" &&
          module.type !== "previous-results" &&
          module.type !== "current-poll" ? (
            <label className="field">
              <span>{module.type === "button" ? "Button label" : "Content"}</span>
              {module.type === "text" ? (
                <BuilderRichTextEditor
                  value={module.text}
                  onChange={(value) =>
                    onUpdateModule((current) => ({
                      ...current,
                      text: value
                    }))
                  }
                />
              ) : (
                <textarea
                  className="builder-textarea"
                  value={module.text}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      text: event.target.value
                    }))
                  }
                  placeholder="Enter content"
                />
              )}
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
