import Image from "next/image";
import { type CSSProperties, useRef, useState } from "react";
import type { BackgroundSettings, BuilderProductRecord, BuilderTemplateModule, BuilderTemplateModuleType } from "@/lib/builder-template";
import {
  createEmptyModule,
  getBuilderBackgroundStyle,
  normalizeBuilderAssetUrl,
  formatRichTextContent,
  sanitizeEmbedHtml
} from "@/lib/builder-template";
import {
  HEADLINE_ROTATOR_DEFAULT_FONT_SIZE,
  HEADLINE_ROTATOR_MAX_Y_PERCENT,
  getHeadlineRotatorSkyPosition,
  parseHeadlineRotatorItemsForEditor,
  serializeHeadlineRotatorEntries,
  type HeadlineRotatorEntry
} from "@/lib/headline-rotator";
import { BuilderRichTextEditor } from "@/components/builder-rich-text-editor";
import {
  DEFAULT_SHARE_TEMPLATE,
  SOCIAL_SHARE_PLATFORMS,
  SocialShareBar,
  getSocialSharePlatformEnabled,
  type SocialSharePlatformId
} from "@/components/social-share-module";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { MerchModuleEditor } from "./builder-merch-module-editor";
import { BuilderCodeEmbed } from "./builder-code-embed";
import { BuilderFloatingImageModuleSettings } from "./builder-floating-image-module-settings";
import { BuilderModuleOffsetFields } from "./builder-module-offset-fields";
import { BuilderImagePreview } from "./builder-image-preview";
import { modulePaletteGroups, modulePaletteItems } from "./builder-types";
import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";
import {
  getAlignmentClass,
  getHeadingModuleStyle,
  getModuleAlignment,
  getModuleBackgroundSettings,
  getModuleMarginStyle,
  getVerticalMarginStyle,
  getVideoEmbedSource,
  isVideoMedia
} from "./builder-utils";

type BuilderModuleCardProps = {
  module: BuilderTemplateModule;
  products?: BuilderProductRecord[];
  sectionId: string;
  editorDevice: "browser" | "mobile";
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateModuleBackground: (updater: (bg: BackgroundSettings) => BackgroundSettings) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onSaveModule: () => void;
  onOpenGallery: () => void;
  onOpenSocialIconGallery: (itemId: string) => void;
  onUploadMedia: (file: File | null) => void;
  onClone: () => void;
  hideHeaderActions?: boolean;
};

type ContactFormField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
};

function getContactFormMode(settings: Record<string, string>): "squeeze" | "standard" | "custom" {
  return settings.formMode === "standard" || settings.formMode === "custom"
    ? settings.formMode
    : "squeeze";
}

function getContactFormFields(mode: "squeeze" | "standard" | "custom"): ContactFormField[] {
  const standardFields: ContactFormField[] = [
    { id: "firstName", label: "First name", type: "text" },
    { id: "lastName", label: "Last name", type: "text" },
    { id: "email", label: "Email", type: "email" },
    { id: "phone", label: "Phone", type: "tel" }
  ];

  if (mode === "squeeze") {
    return [standardFields[0], standardFields[2]];
  }

  return standardFields;
}

function renderContactFormPreview(settings: Record<string, string>, interactive = false) {
  const mode = getContactFormMode(settings);
  const fields = getContactFormFields(mode);
  const Tag = interactive ? "form" : "div";

  return (
    <Tag className="builder-contact-form" onSubmit={interactive ? (event) => event.preventDefault() : undefined}>
      <div className="builder-contact-form-fields">
        {fields.map((field) => (
          <label className="builder-contact-form-field" key={field.id}>
            <span>{field.label}</span>
            {interactive ? (
              <input type={field.type} placeholder={field.label} />
            ) : (
              <span className="builder-contact-form-input-preview">{field.label}</span>
            )}
          </label>
        ))}
      </div>
      {mode === "custom" ? (
        <div className="builder-contact-form-stub">Custom form builder coming soon. Standard fields are shown for now.</div>
      ) : null}
      {interactive ? (
        <button className="builder-contact-form-submit" type="submit">
          Submit
        </button>
      ) : (
        <span className="builder-contact-form-submit builder-contact-form-submit-preview">
          Submit
        </span>
      )}
    </Tag>
  );
}

function renderMerchProductCard(settings: Record<string, string>) {
  const productName = settings.productName || "Merch product";
  const imageUrl = normalizeBuilderAssetUrl(settings.imageUrl);
  const productUrl = normalizeBuilderAssetUrl(settings.productUrl);
  const buttonLabel = settings.buttonLabel || "Buy on Redbubble";

  return (
    <div className="product-card">
      {imageUrl ? (
        <img src={imageUrl} alt={productName} suppressHydrationWarning />
      ) : (
        <div className="builder-module-preview-placeholder">Fetch a product URL</div>
      )}
      <h3>{productName}</h3>
      {productUrl ? (
        <a href={productUrl} target="_blank" rel="noopener noreferrer">
          {buttonLabel}
        </a>
      ) : null}
    </div>
  );
}

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

  if (module.type === "headline-rotator") {
    const items = parseHeadlineItems(module.settings);
    const fontSize =
      Number.parseInt(module.settings.fontSize ?? HEADLINE_ROTATOR_DEFAULT_FONT_SIZE, 10) ||
      Number.parseInt(HEADLINE_ROTATOR_DEFAULT_FONT_SIZE, 10);
    const color = module.settings.color || "#18324a";
    const isBold = module.settings.bold !== "false";
    const horizontal = getModuleAlignment(module.settings);
    const verticalAlignment =
      (module.settings.verticalAlignment as "top" | "center" | "bottom") || "center";
    const minHeight = Math.max(Number.parseInt(module.settings.minHeight ?? "0", 10) || 0, 0);
    const justify =
      verticalAlignment === "top" ? "flex-start" : verticalAlignment === "bottom" ? "flex-end" : "center";
    const first = items[0]?.label || "Headline Rotator";

    return (
      <div className="builder-module-preview-copy">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: justify,
            minHeight: minHeight ? `${minHeight}px` : undefined,
            textAlign: horizontal,
            color,
            fontSize: `${fontSize}px`,
            fontWeight: isBold ? 700 : 400,
            textShadow: getHeadingModuleStyle(module.settings).textShadow
          }}
        >
          {first}
        </div>
        <div className="builder-module-editor-copy">
          {items.length > 0 ? `${items.length} headline${items.length === 1 ? "" : "s"}` : "No headlines yet"}
        </div>
      </div>
    );
  }

  if (module.type === "button") {
    const s = module.settings;
    const sizeClass = `builder-preview-button-${s.buttonSize ?? "medium"}`;
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
          className={`builder-preview-button builder-preview-button-styled builder-preview-button-${variant || "default"} ${sizeClass}`}
          style={btnStyle}
        >
          {module.text || "Button"}
        </span>
      </div>
    );
  }

  if (module.type === "code") {
    return (
      <div className="builder-code-module-preview">
        <div className="builder-code-module-preview-label">
          {module.settings.label || module.name || "Code snippet"}
        </div>
        {module.text ? (
          <BuilderCodeEmbed
            html={sanitizeEmbedHtml(module.text)}
            className="builder-code-module-render"
            requireActivation={false}
          />
        ) : (
          <div className="builder-module-preview-placeholder">Add embed code or HTML</div>
        )}
      </div>
    );
  }

  if (module.type === "merch") {
    return renderMerchProductCard(module.settings);
  }

  if (module.type === "contact-form") {
    return renderContactFormPreview(module.settings);
  }

  if (module.type === "video" || (module.type === "image" && module.settings.variant === "video")) {
    const embed = getVideoEmbedSource(module.settings.url);
    const title = module.settings.videoName || module.name || module.text || "Video";
    const opensInNewTab = module.settings.newTab !== "false";

    return (
      <figure className="builder-preview-video-card builder-module-preview-video-card">
        <div className="builder-preview-video-frame">
          {embed?.kind === "iframe" ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={embed.src}
              title={title}
            />
          ) : embed?.kind === "video" ? (
            <video className="builder-preview-video" controls preload="metadata" src={embed.src} />
          ) : (
            <div className="builder-module-preview-placeholder">Add a video embed URL</div>
          )}
          {embed ? (
            <a
              aria-label={`Open ${title} in a new tab`}
              className="builder-preview-video-link"
              href={embed.href}
              rel={opensInNewTab ? "noopener noreferrer" : undefined}
              target={opensInNewTab ? "_blank" : undefined}
            />
          ) : null}
        </div>
        {title ? (
          <figcaption className="builder-preview-video-caption">
            <strong>{title}</strong>
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (module.type === "image" || module.type === "floating-image") {
    return (
      <BuilderImagePreview
        module={module}
        variant={variant}
        imageClassName="builder-preview-image builder-module-preview-image"
        placeholder={
          module.type === "floating-image" ? "Choose a floating image" : "Choose an image or video"
        }
      />
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
            <a
              key={item.id}
              className="builder-module-preview-social-item"
              href={item.href || "#"}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span
                className="builder-module-preview-social-icon"
                style={{ width: `${iconSize}px`, height: `${iconSize}px`, background: item.backgroundColor }}
              >
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

  if (module.type === "social-share") {
    return (
      <SocialShareBar
        preview
        settings={module.settings}
        poll={{
          id: "preview-poll",
          question: module.settings.shareFallbackQuestion || "Would you rather be right alone or wrong with everyone?",
          options: []
        }}
      />
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
  backgroundColor: string;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
};

type HeadlineItem = HeadlineRotatorEntry;

function parseHeadlineItems(settings: Record<string, string>): HeadlineItem[] {
  return parseHeadlineRotatorItemsForEditor(settings.headlines ?? "", settings.color || "#18324a");
}

function serializeHeadlineItems(items: HeadlineItem[]) {
  return serializeHeadlineRotatorEntries(items);
}

function parseNavItems(settings: Record<string, string>): NavItem[] {
  try {
    const items = JSON.parse(settings.navItems || "[]");
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(raw.id || `nav-${index + 1}`),
        label: String(raw.label || ""),
        href: String(raw.href || "")
      };
    });
  } catch {
    return [];
  }
}

function serializeNavItems(items: NavItem[]) {
  return JSON.stringify(items);
}

function renderCompactCellModulePreview(module: BuilderTemplateModule) {
  return <div className="builder-table-cell-module-preview">{renderModulePreview(module)}</div>;
}

function parseSliderItems(settings: Record<string, string>): SliderItem[] {
  try {
    const items = JSON.parse(settings.sliderItems || "[]");
    if (!Array.isArray(items)) return [];
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
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(raw.id || `social-${index + 1}`),
        label: String(raw.label || ""),
        href: String(raw.href || ""),
        iconUrl: normalizeBuilderAssetUrl(raw.iconUrl),
        backgroundColor: String(raw.backgroundColor || "rgba(255, 255, 255, 0.94)")
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

    if (data.cells && typeof data.rowCount === "number") {
      const cells: Record<string, BuilderTemplateModule[]> = {};
      for (const [key, mods] of Object.entries(data.cells)) {
        cells[key] = Array.isArray(mods) ? (mods as BuilderTemplateModule[]) : [];
      }
      return { headers, cells, rowCount: data.rowCount };
    }

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

function cloneTableCellModule(module: BuilderTemplateModule, suffix: string): BuilderTemplateModule {
  return {
    ...module,
    id: `${module.type}-${Date.now()}-${suffix}`,
    settings: { ...module.settings }
  };
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
              type="button"
              className="builder-table-cell-module-toggle"
              onClick={() => setEditingId(editingId === mod.id ? null : mod.id)}
            >
              <span className="builder-table-cell-module-label">{mod.name || mod.type}</span>
              <span>{editingId === mod.id ? "▾" : "▸"}</span>
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

              {mod.type === "heading" && (
                <>
                  <label className="field">
                    <span>Heading text</span>
                    <input type="text" value={mod.text} onChange={(e) => updateModuleField(mod.id, "text", e.target.value)} placeholder="Enter heading" />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Level</span>
                      <select value={mod.settings.level ?? "h2"} onChange={(e) => updateModuleSettings(mod.id, { level: e.target.value })}>
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
                      <input type="number" min="10" max="160" step="1" value={mod.settings.fontSize ?? "32"} onChange={(e) => updateModuleSettings(mod.id, { fontSize: e.target.value })} />
                    </label>
                    <label className="field">
                      <span>Color</span>
                      <input type="color" value={mod.settings.color ?? "#18324a"} onChange={(e) => updateModuleSettings(mod.id, { color: e.target.value })} />
                    </label>
                  </div>
                  <BuilderModuleOffsetFields
                    horizontalOffset={mod.settings.horizontalOffset ?? "0"}
                    verticalOffset={mod.settings.verticalOffset ?? "0"}
                    onHorizontalOffsetChange={(horizontalOffset) =>
                      updateModuleSettings(mod.id, { horizontalOffset })
                    }
                    onVerticalOffsetChange={(verticalOffset) =>
                      updateModuleSettings(mod.id, { verticalOffset })
                    }
                  />
                </>
              )}

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
                <>
                  <label className="field">
                    <span>Button label</span>
                    <input type="text" value={mod.text} onChange={(e) => updateModuleField(mod.id, "text", e.target.value)} placeholder="Button text" />
                  </label>
                  <div className="builder-table-cell-module-inline-grid">
                    <label className="field">
                      <span>Link</span>
                      <input type="text" value={mod.settings.href ?? ""} onChange={(e) => updateModuleSettings(mod.id, { href: e.target.value })} placeholder="/path-or-url" />
                    </label>
                    <label className="field">
                      <span>Button color</span>
                      <input type="color" value={mod.settings.buttonColor ?? "#214c71"} onChange={(e) => updateModuleSettings(mod.id, { buttonColor: e.target.value })} />
                    </label>
                    <label className="field">
                      <span>Text color</span>
                      <input type="color" value={mod.settings.textColor ?? "#ffffff"} onChange={(e) => updateModuleSettings(mod.id, { textColor: e.target.value })} />
                    </label>
                  </div>
                </>
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
        <label className="field"><span>Border width</span><input type="range" min="0" max="6" step="1" value={module.settings.borderWidth ?? "1"} onChange={(e) => updateSetting("borderWidth", e.target.value)} /></label>
        <label className="field"><span>Border color</span><input type="color" value={module.settings.borderColor ?? "#cccccc"} onChange={(e) => updateSetting("borderColor", e.target.value)} /></label>
        <label className="field"><span>Cell padding</span><input type="range" min="2" max="24" step="1" value={module.settings.cellPadding ?? "8"} onChange={(e) => updateSetting("cellPadding", e.target.value)} /></label>
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

function SliderModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseSliderItems(module.settings);

  function persist(nextItems: SliderItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderItems: serializeSliderItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<SliderItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) { persist(items.filter((item) => item.id !== id)); }

  function addItem() {
    persist([...items, { id: `slide-${Date.now()}-${items.length + 1}`, title: "", body: "", imageUrl: "", linkUrl: "" }]);
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Card width</span><input type="range" min="180" max="420" step="10" value={module.settings.sliderCardWidth ?? "280"} onChange={(e) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderCardWidth: e.target.value } }))} /></label>
        <label className="field"><span>Gap</span><input type="range" min="8" max="40" step="2" value={module.settings.sliderGap ?? "16"} onChange={(e) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderGap: e.target.value } }))} /></label>
      </div>
      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.title || `Slide ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete slide">✕</button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field"><span>Title</span><input type="text" value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} /></label>
              <label className="field"><span>Link</span><input type="text" value={item.linkUrl} onChange={(e) => updateItem(item.id, { linkUrl: e.target.value })} placeholder="/path-or-url" /></label>
              <label className="field builder-slider-item-grid-full"><span>Image URL</span><input type="text" value={item.imageUrl} onChange={(e) => updateItem(item.id, { imageUrl: normalizeBuilderAssetUrl(e.target.value) })} placeholder="https://..." /></label>
              <label className="field builder-slider-item-grid-full"><span>Description</span><textarea className="builder-textarea" rows={3} value={item.body} onChange={(e) => updateItem(item.id, { body: e.target.value })} placeholder="Add copy for this slide" /></label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Slide</button>
    </>
  );
}

function SocialModuleEditor({
  module,
  onUpdateModule,
  onOpenGallery
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onOpenGallery: (itemId: string) => void;
}) {
  const items = parseSocialItems(module.settings);

  function persist(nextItems: SocialItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, socialItems: serializeSocialItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<SocialItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) { persist(items.filter((item) => item.id !== id)); }

  function addItem() {
    persist([
      ...items,
      {
        id: `social-${Date.now()}-${items.length + 1}`,
        label: "",
        href: "",
        iconUrl: "",
        backgroundColor: "rgba(255, 255, 255, 0.94)"
      }
    ]);
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Icon size</span><input type="range" min="24" max="84" step="2" value={module.settings.socialIconSize ?? "44"} onChange={(e) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, socialIconSize: e.target.value } }))} /></label>
        <label className="field"><span>Gap</span><input type="range" min="6" max="32" step="2" value={module.settings.socialGap ?? "14"} onChange={(e) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, socialGap: e.target.value } }))} /></label>
        <label className="field builder-checkbox-field">
          <span>Show labels</span>
          <input type="checkbox" checked={module.settings.socialShowLabels !== "false"} onChange={(e) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, socialShowLabels: e.target.checked ? "true" : "false" } }))} />
        </label>
      </div>
      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.label || `Network ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete icon">✕</button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field"><span>Label</span><input type="text" value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} /></label>
              <label className="field"><span>Link</span><input type="text" value={item.href} onChange={(e) => updateItem(item.id, { href: e.target.value })} placeholder="https://..." /></label>
              <label className="field">
                <span>Background color</span>
                <input
                  type="text"
                  value={item.backgroundColor}
                  onChange={(e) => updateItem(item.id, { backgroundColor: e.target.value })}
                  placeholder="#ffffff or rgba(255,255,255,0.94)"
                />
              </label>
              <div className="builder-slider-item-grid-full builder-social-icon-picker">
                <label className="field">
                  <span>Icon</span>
                  <input type="text" value={item.iconUrl} readOnly placeholder="Choose an icon from the gallery" />
                </label>
                <button className="secondary-button builder-social-icon-picker-button" onClick={() => onOpenGallery(item.id)} type="button">
                  Choose From Gallery
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Social Icon</button>
    </>
  );
}

function SocialShareModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function platformSettingKey(platformId: SocialSharePlatformId, suffix: string) {
    return `share${platformId}${suffix}`;
  }

  function getPlatformColor(platformId: SocialSharePlatformId, fallback: string) {
    const color = module.settings[platformSettingKey(platformId, "Color")];
    return color?.startsWith("#") ? color : fallback;
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field">
          <span>Share label</span>
          <input
            type="text"
            value={module.settings.shareLabel ?? "Share this poll"}
            onChange={(event) => updateSetting("shareLabel", event.target.value)}
          />
        </label>
        <label className="field">
          <span>URL override</span>
          <input
            type="text"
            value={module.settings.shareUrl ?? ""}
            onChange={(event) => updateSetting("shareUrl", event.target.value)}
            placeholder="Leave blank to use current page URL"
          />
        </label>
        <label className="field">
          <span>Fallback question</span>
          <input
            type="text"
            value={module.settings.shareFallbackQuestion ?? ""}
            onChange={(event) => updateSetting("shareFallbackQuestion", event.target.value)}
            placeholder="Used only when no current poll is available"
          />
        </label>
        <label className="field">
          <span>Hashtags</span>
          <input
            type="text"
            value={module.settings.shareHashtags ?? ""}
            onChange={(event) => updateSetting("shareHashtags", event.target.value)}
            placeholder="Normie,WYR"
          />
        </label>
        <label className="field">
          <span>X via</span>
          <input
            type="text"
            value={module.settings.shareVia ?? ""}
            onChange={(event) => updateSetting("shareVia", event.target.value)}
            placeholder="Normie765714"
          />
        </label>
        <label className="field">
          <span>Label font size</span>
          <input
            type="range"
            min="8"
            max="64"
            step="1"
            value={module.settings.shareLabelSize ?? "14"}
            onChange={(event) => updateSetting("shareLabelSize", event.target.value)}
          />
          <small>{module.settings.shareLabelSize ?? "14"}px</small>
        </label>
        <label className="field">
          <span>Icon background</span>
          <input
            type="color"
            value={module.settings.shareIconBackground?.startsWith("#") ? module.settings.shareIconBackground : "#ffffff"}
            onChange={(event) => updateSetting("shareIconBackground", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Icon size</span>
          <input
            type="range"
            min="20"
            max="120"
            step="2"
            value={module.settings.shareIconSize ?? "36"}
            onChange={(event) => updateSetting("shareIconSize", event.target.value)}
          />
          <small>{module.settings.shareIconSize ?? "36"}px</small>
        </label>
        <label className="field">
          <span>Glyph size</span>
          <input
            type="range"
            min="10"
            max="96"
            step="1"
            value={module.settings.shareGlyphSize ?? "20"}
            onChange={(event) => updateSetting("shareGlyphSize", event.target.value)}
          />
          <small>{module.settings.shareGlyphSize ?? "20"}px</small>
        </label>
        <label className="field">
          <span>Icon gap</span>
          <input
            type="range"
            min="0"
            max="64"
            step="1"
            value={module.settings.shareIconGap ?? "12"}
            onChange={(event) => updateSetting("shareIconGap", event.target.value)}
          />
          <small>{module.settings.shareIconGap ?? "12"}px</small>
        </label>
      </div>
      <label className="field">
        <span>Default post template</span>
        <textarea
          className="builder-textarea"
          rows={3}
          value={module.settings.shareTemplate ?? DEFAULT_SHARE_TEMPLATE}
          onChange={(event) => updateSetting("shareTemplate", event.target.value)}
          placeholder={DEFAULT_SHARE_TEMPLATE}
        />
      </label>
      <div className="builder-slider-items">
        {SOCIAL_SHARE_PLATFORMS.map((platform) => (
          <div className="builder-slider-item-card" key={platform.id}>
            <div className="builder-slider-item-header">
              <strong>{platform.label}</strong>
              <label className="field builder-checkbox-field">
                <span>Show</span>
                <input
                  type="checkbox"
                  checked={getSocialSharePlatformEnabled(module.settings, platform.id)}
                  onChange={(event) =>
                    updateSetting(platformSettingKey(platform.id, "Enabled"), event.target.checked ? "true" : "false")
                  }
                />
              </label>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field">
                <span>Button color</span>
                <input
                  type="color"
                  value={getPlatformColor(platform.id, platform.color)}
                  onChange={(event) => updateSetting(platformSettingKey(platform.id, "Color"), event.target.value)}
                />
              </label>
              {platform.id === "instagram" ? (
                <label className="field builder-slider-item-grid-full">
                  <span>Instagram URL</span>
                  <input
                    type="text"
                    value={module.settings[platformSettingKey(platform.id, "Url")] ?? ""}
                    onChange={(event) => updateSetting(platformSettingKey(platform.id, "Url"), event.target.value)}
                    placeholder="https://www.instagram.com/your-profile"
                  />
                </label>
              ) : null}
              {platform.supportsText ? (
                <label className="field builder-slider-item-grid-full">
                  <span>Post template</span>
                  <textarea
                    className="builder-textarea"
                    rows={3}
                    value={module.settings[platformSettingKey(platform.id, "Template")] ?? ""}
                    onChange={(event) => updateSetting(platformSettingKey(platform.id, "Template"), event.target.value)}
                    placeholder="Leave blank to use the default template"
                  />
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function NavModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseNavItems(module.settings);

  function persist(nextItems: NavItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, navItems: serializeNavItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<NavItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) { persist(items.filter((item) => item.id !== id)); }

  function addItem() {
    persist([...items, { id: `nav-${Date.now()}-${items.length + 1}`, label: "", href: "" }]);
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Font size (px)</span><input type="number" min="10" max="48" value={module.settings.navFontSize ?? "16"} onChange={(e) => updateSetting("navFontSize", e.target.value)} /></label>
        <label className="field builder-checkbox-field"><span>Bold</span><input type="checkbox" checked={module.settings.navBold === "true"} onChange={(e) => updateSetting("navBold", e.target.checked ? "true" : "false")} /></label>
        <label className="field"><span>Border radius (px)</span><input type="number" min="0" max="48" value={module.settings.navBorderRadius ?? "0"} onChange={(e) => updateSetting("navBorderRadius", e.target.value)} /></label>
        <label className="field"><span>Padding</span><input type="text" value={module.settings.navPadding ?? "8px 12px"} onChange={(e) => updateSetting("navPadding", e.target.value)} placeholder="8px 12px" /></label>
        <label className="field"><span>Text color</span><input type="text" value={module.settings.navColor ?? ""} onChange={(e) => updateSetting("navColor", e.target.value)} placeholder="#ffffff" /></label>
        <label className="field"><span>Hover text color</span><input type="text" value={module.settings.navHoverColor ?? ""} onChange={(e) => updateSetting("navHoverColor", e.target.value)} placeholder="#ffffff" /></label>
        <label className="field"><span>Hover background</span><input type="text" value={module.settings.navHoverBackground ?? ""} onChange={(e) => updateSetting("navHoverBackground", e.target.value)} placeholder="rgba(0,0,0,0.1)" /></label>
      </div>
      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.label || `Link ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete link">✕</button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field"><span>Label</span><input type="text" value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} /></label>
              <label className="field"><span>Link</span><input type="text" value={item.href} onChange={(e) => updateItem(item.id, { href: e.target.value })} placeholder="/path-or-url" /></label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Nav Item</button>
    </>
  );
}

function HeadlineRotatorModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseHeadlineItems(module.settings);

  function persist(nextItems: HeadlineItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, headlines: serializeHeadlineItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<HeadlineItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) { persist(items.filter((item) => item.id !== id)); }

  function addItem() {
    const position = getHeadlineRotatorSkyPosition(items.length);
    persist([
      ...items,
      {
        id: `headline-${Date.now()}-${items.length + 1}`,
        label: "",
        href: "",
        xAxis: position.xAxis,
        yAxis: position.yAxis,
        color: module.settings.color || "#18324a",
        overlap: "400"
      }
    ]);
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Font size (px)</span><input type="number" min="10" max="120" value={module.settings.fontSize ?? HEADLINE_ROTATOR_DEFAULT_FONT_SIZE} onChange={(e) => updateSetting("fontSize", e.target.value)} /></label>
        <label className="field"><span>Color</span><input type="text" value={module.settings.color ?? "#18324a"} onChange={(e) => updateSetting("color", e.target.value)} placeholder="#18324a" /></label>
        <label className="field builder-checkbox-field"><span>Bold</span><input type="checkbox" checked={module.settings.bold !== "false"} onChange={(e) => updateSetting("bold", e.target.checked ? "true" : "false")} /></label>
        <label className="field"><span>Vertical alignment</span><select value={module.settings.verticalAlignment ?? "center"} onChange={(e) => updateSetting("verticalAlignment", e.target.value)}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
        <label className="field"><span>Min height (px)</span><input type="number" min="0" max="1200" step="4" value={module.settings.minHeight ?? "480"} onChange={(e) => updateSetting("minHeight", e.target.value)} /></label>
        <label className="field"><span>Fade duration (ms)</span><input type="number" min="0" max="5000" step="50" value={module.settings.fadeDuration ?? "800"} onChange={(e) => updateSetting("fadeDuration", e.target.value)} /></label>
        <label className="field"><span>Display speed (ms)</span><input type="number" min="500" max="20000" step="100" value={module.settings.displaySpeed ?? "3000"} onChange={(e) => updateSetting("displaySpeed", e.target.value)} /></label>
        <label className="field"><span>Drop shadow</span><select value={module.settings.dropShadow ?? "false"} onChange={(e) => updateSetting("dropShadow", e.target.value)}><option value="false">Off</option><option value="true">On</option></select></label>
        <label className="field"><span>Shadow color</span><input type="color" value={module.settings.dropShadowColor?.startsWith("#") ? module.settings.dropShadowColor : "#000000"} onChange={(e) => updateSetting("dropShadowColor", e.target.value)} /></label>
        <label className="field"><span>Shadow X</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowX ?? "3"} onChange={(e) => updateSetting("dropShadowX", e.target.value)} /></label>
        <label className="field"><span>Shadow Y</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowY ?? "3"} onChange={(e) => updateSetting("dropShadowY", e.target.value)} /></label>
        <label className="field"><span>Shadow blur</span><input type="number" min="0" max="30" step="1" value={module.settings.dropShadowBlur ?? "2"} onChange={(e) => updateSetting("dropShadowBlur", e.target.value)} /></label>
      </div>
      <div className="builder-headline-table-wrap">
        <table className="builder-headline-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Link</th>
              <th>X-axis</th>
              <th>Y-axis</th>
              <th>Color</th>
              <th>Overlap (ms)</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <input
                    aria-label={`Headline ${index + 1}`}
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} link`}
                    type="text"
                    value={item.href}
                    onChange={(e) => updateItem(item.id, { href: e.target.value })}
                    placeholder="/path-or-url"
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} x-axis`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    title="Horizontal position (0 = left, 100 = right)"
                    value={item.xAxis}
                    onChange={(e) => updateItem(item.id, { xAxis: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} y-axis`}
                    type="number"
                    min="0"
                    max={String(HEADLINE_ROTATOR_MAX_Y_PERCENT)}
                    step="1"
                    title={`Vertical position in the sky band (0 = top, ${HEADLINE_ROTATOR_MAX_Y_PERCENT} = just above horizon)`}
                    value={item.yAxis}
                    onChange={(e) => updateItem(item.id, { yAxis: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} color`}
                    type="color"
                    value={item.color.startsWith("#") ? item.color : module.settings.color || "#18324a"}
                    onChange={(e) => updateItem(item.id, { color: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} overlap`}
                    type="number"
                    min="0"
                    max="10000"
                    step="50"
                    title="Milliseconds the next headline fades in before the current one finishes (e.g. 400 with 800ms fade)"
                    value={item.overlap}
                    onChange={(e) => updateItem(item.id, { overlap: e.target.value })}
                  />
                </td>
                <td>
                  <div className="builder-headline-table-actions">
                    <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                    <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                    <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete headline">✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={7}>No headlines yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Headline</button>
    </>
  );
}

export function BuilderModuleCard({
  module,
  sectionId,
  editorDevice,
  isExpanded,
  onToggleExpanded,
  onUpdateModule,
  onUpdateModuleBackground,
  onMoveUp,
  onMoveDown,
  onRemove,
  onOpenGallery,
  onOpenSocialIconGallery,
  onUploadMedia,
  onSaveModule,
  onClone,
  products = [],
  hideHeaderActions = false
}: BuilderModuleCardProps) {
    const moduleAlignment = getModuleAlignment(module.settings);
    const mobileAlignment = module.settings.mobileAlignment ?? "";
    const isVideoModule = module.type === "video" || (module.type === "image" && module.settings.variant === "video");
    const isStandardImage = module.type === "image" && !isVideoModule;
    const isFloatingImage = module.type === "floating-image";
    const isHeadingModule = module.type === "heading";
  return (
    <div
      className={`builder-module-card ${getAlignmentClass(moduleAlignment)}`}
      style={{
        ...(getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings)) ?? {}),
        ...(isHeadingModule
          ? getModuleMarginStyle(module.settings)
          : getVerticalMarginStyle(module.settings.verticalMargin))
      }}
    >
      <div className="builder-module-header">
        <div className="builder-module-title">
          <strong>{module.name || module.type}</strong>
          <span>{module.type}</span>
        </div>
        {hideHeaderActions ? (
          <div className="builder-section-actions">
            <button aria-label={isExpanded ? "Collapse module" : "Expand module"} className="builder-icon-button" onClick={onToggleExpanded} title={isExpanded ? "Collapse module" : "Expand module"} type="button">{isExpanded ? "▾" : "▸"}</button>
          </div>
        ) : (
          <div className="builder-section-actions">
            <button aria-label={isExpanded ? "Collapse module" : "Expand module"} className="builder-icon-button" onClick={onToggleExpanded} title={isExpanded ? "Collapse module" : "Expand module"} type="button">{isExpanded ? "▾" : "▸"}</button>
            <button aria-label="Move module up" className="builder-icon-button" onClick={onMoveUp} title="Move module up" type="button">↑</button>
            <button aria-label="Move module down" className="builder-icon-button" onClick={onMoveDown} title="Move module down" type="button">↓</button>
            <button
              aria-label="Clone module"
              className="builder-icon-button"
              onClick={onClone}
              title="Clone module"
              type="button"
            >
              ⧉
            </button>
            <button
              aria-label="Save module"
              className="builder-icon-button"
              onClick={onSaveModule}
              title="Save module"
              type="button"
            >
              💾
            </button>
            <button aria-label="Delete module" className="builder-icon-button builder-icon-button-danger" onClick={onRemove} title="Delete module" type="button">✕</button>
          </div>
        )}
      </div>

      {!isExpanded ? (
        <button className="builder-module-preview-button" onClick={onToggleExpanded} type="button">
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
              onChange={(event) => onUpdateModule((current) => ({ ...current, name: event.target.value }))}
              placeholder="Optional internal label"
            />
          </label>

          {editorDevice === "mobile" ? (
            <div className="builder-module-settings-row builder-module-settings-row-mobile">
              <label className="field builder-checkbox-field">
                <span>Hide module on mobile</span>
                <input
                  type="checkbox"
                  checked={module.settings.mobileHidden === "true"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, mobileHidden: event.target.checked ? "true" : "false" }
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Mobile alignment</span>
                <select
                  value={mobileAlignment}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, mobileAlignment: event.target.value }
                    }))
                  }
                >
                  <option value="">Use browser setting</option>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              {(module.type === "heading" || module.type === "headline-rotator") ? (
                <label className="field">
                  <span>Mobile font size</span>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    step="1"
                    value={module.settings.mobileFontSize ?? ""}
                    onChange={(event) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: { ...current.settings, mobileFontSize: event.target.value }
                      }))
                    }
                    placeholder="Auto"
                  />
                </label>
              ) : null}
              <div className="builder-mobile-context-note">
                Mobile overrides are kept separate from browser settings.
              </div>
            </div>
          ) : (
          <>
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
                    className={option.value === moduleAlignment ? "builder-icon-button builder-icon-button-active" : "builder-icon-button"}
                    onClick={() => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, alignment: option.value } }))}
                    title={option.label}
                    type="button"
                  >
                    {option.icon}
                  </button>
                ))}
              </div>
            </div>
            {module.type !== "heading" ? (
              <label className="field builder-module-vertical-margin-field">
                <span>Vertical margin</span>
                <input
                  type="range"
                  min="0"
                  max="160"
                  step="1"
                  value={module.settings.verticalMargin ?? "0"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, verticalMargin: event.target.value }
                    }))
                  }
                />
                <small>{module.settings.verticalMargin ?? "0"}px</small>
              </label>
            ) : null}
          </div>

          {isStandardImage ? (
            <BuilderModuleOffsetFields
              horizontalOffset={module.settings.horizontalOffset ?? "0"}
              verticalOffset={module.settings.verticalOffset ?? "0"}
              onHorizontalOffsetChange={(horizontalOffset) =>
                onUpdateModule((current) => ({
                  ...current,
                  settings: { ...current.settings, horizontalOffset }
                }))
              }
              onVerticalOffsetChange={(verticalOffset) =>
                onUpdateModule((current) => ({
                  ...current,
                  settings: { ...current.settings, verticalOffset }
                }))
              }
            />
          ) : null}

          {(isStandardImage || isFloatingImage || module.type === "video" || module.type === "button") && (
            <label className="field">
              <span>{module.type === "button" ? "Link" : isVideoModule ? "Video embed URL" : "URL"}</span>
              <input
                type="text"
                value={module.settings[module.type === "button" ? "href" : "url"] ?? ""}
                onChange={(event) =>
                  onUpdateModule((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      [module.type === "button" ? "href" : "url"]:
                        module.type === "button" ? event.target.value : normalizeBuilderAssetUrl(event.target.value)
                    }
                  }))
                }
                placeholder={
                  isVideoModule
                    ? "YouTube, Vimeo, embed URL, or uploaded video"
                    : isStandardImage || isFloatingImage
                      ? "https://..."
                      : "/path-or-url"
                }
              />
            </label>
          )}

          {isStandardImage ? (
            <label className="field">
              <span>Link</span>
              <input
                type="text"
                value={module.settings.linkUrl ?? ""}
                onChange={(event) =>
                  onUpdateModule((current) => ({
                    ...current,
                    settings: { ...current.settings, linkUrl: normalizeBuilderAssetUrl(event.target.value) }
                  }))
                }
                placeholder="/path-or-url"
              />
            </label>
          ) : null}

          {(isVideoModule || isStandardImage) ? (
            <label className="field builder-checkbox-field">
              <span>New Tab</span>
              <input
                type="checkbox"
                checked={isVideoModule ? module.settings.newTab !== "false" : module.settings.newTab === "true"}
                onChange={(event) =>
                  onUpdateModule((current) => ({
                    ...current,
                    settings: { ...current.settings, newTab: event.target.checked ? "true" : "false" }
                  }))
                }
              />
            </label>
          ) : null}

          {module.type === "button" && (
            <div className="builder-button-design-grid">
              <label className="field">
                <span>Size</span>
                <select
                  value={module.settings.buttonSize ?? "medium"}
                  onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, buttonSize: e.target.value } }))}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
              <label className="field"><span>Button color</span><input type="color" value={module.settings.buttonColor ?? "#214c71"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, buttonColor: e.target.value } }))} /></label>
              <label className="field"><span>Hover color</span><input type="color" value={module.settings.buttonHoverColor ?? "#0f4f8f"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, buttonHoverColor: e.target.value } }))} /></label>
              <label className="field"><span>Text color</span><input type="color" value={module.settings.textColor ?? "#ffffff"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, textColor: e.target.value } }))} /></label>
              <label className="field"><span>Text hover</span><input type="color" value={module.settings.textHoverColor ?? "#ffffff"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, textHoverColor: e.target.value } }))} /></label>
              <label className="field"><span>Border color</span><input type="color" value={module.settings.borderColor ?? "#214c71"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, borderColor: e.target.value } }))} /></label>
              <label className="field"><span>H padding</span><input type="range" min="4" max="60" step="2" value={module.settings.paddingX ?? "24"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, paddingX: e.target.value } }))} /></label>
              <label className="field"><span>V padding</span><input type="range" min="2" max="40" step="2" value={module.settings.paddingY ?? "12"} onChange={(e) => onUpdateModule((c) => ({ ...c, settings: { ...c.settings, paddingY: e.target.value } }))} /></label>
            </div>
          )}

          {module.type === "contact-form" && (
            <div className="builder-contact-form-settings">
              <label className="field">
                <span>Form type</span>
                <select
                  value={getContactFormMode(module.settings)}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, formMode: event.target.value }
                    }))
                  }
                >
                  <option value="squeeze">Squeeze</option>
                  <option value="standard">Standard</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {getContactFormMode(module.settings) === "custom" ? (
                <div className="builder-module-runtime-note">
                  <strong>Custom form builder stub</strong>
                  <p>Custom starts from the standard form. Field adding and advanced form types will be wired in next.</p>
                </div>
              ) : null}
            </div>
          )}

          {isVideoModule ? (
            <div className="builder-video-controls-grid">
              <label className="field">
                <span>Video name</span>
                <input
                  type="text"
                  value={module.settings.videoName ?? module.name ?? ""}
                  onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, videoName: event.target.value } }))}
                  placeholder="Video title"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="builder-textarea"
                  value={module.settings.videoDescription ?? ""}
                  onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, videoDescription: event.target.value } }))}
                  placeholder="Short description"
                />
              </label>
            </div>
          ) : null}

          {(isStandardImage || isFloatingImage || module.type === "video") ? (
            <div className="builder-media-actions">
              <button className="secondary-button builder-gallery-button" onClick={onOpenGallery} type="button">Choose From Gallery</button>
              <label className="secondary-button builder-gallery-button builder-upload-button">
                <span>Upload To Gallery</span>
                <input className="builder-upload-input" type="file" accept="image/*,video/*" onChange={(event) => { onUploadMedia(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
              </label>
            </div>
          ) : null}

          {isFloatingImage ? <BuilderFloatingImageModuleSettings module={module} onUpdateModule={onUpdateModule} /> : null}

          {isStandardImage ? (
            <>
              <label className="field">
                <span>Alt text</span>
                <input type="text" value={module.settings.alt ?? ""} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, alt: event.target.value } }))} placeholder="Image description" />
              </label>
              <div className="builder-image-controls-grid">
                <label className="field">
                  <span>Size</span>
                  <select value={module.settings.size ?? "100"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, size: event.target.value } }))}>
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
                <label className="field"><span>Border thickness</span><input type="range" min="0" max="24" step="1" value={module.settings.borderThickness ?? "0"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderThickness: event.target.value } }))} /></label>
                <label className="field"><span>Border color</span><input type="color" value={module.settings.borderColor ?? "#0f4f8f"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderColor: event.target.value } }))} /></label>
                <label className="field"><span>Border radius</span><input type="range" min="0" max="80" step="1" value={module.settings.borderRadius ?? "18"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderRadius: event.target.value } }))} /></label>
                <label className="field">
                  <span>Effect</span>
                  <select value={module.settings.effect ?? "none"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, effect: event.target.value } }))}>
                    <option value="none">None</option>
                    <option value="bounce">Bounce</option>
                    <option value="spin">Spin</option>
                    <option value="cruise">Cruise</option>
                    <option value="tumbleweed">Tumbleweed</option>
                  </select>
                </label>
              </div>
            </>
          ) : null}

          {module.type === "heading" ? (
            <>
            <div className="builder-typography-controls-grid">
              <label className="field">
                <span>Top margin</span>
                <input
                  type="range"
                  min="0"
                  max="160"
                  step="1"
                  value={module.settings.marginTop ?? module.settings.verticalMargin ?? "0"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, marginTop: event.target.value }
                    }))
                  }
                />
                <small>{module.settings.marginTop ?? module.settings.verticalMargin ?? "0"}px</small>
              </label>
              <label className="field">
                <span>Bottom margin</span>
                <input
                  type="range"
                  min="0"
                  max="160"
                  step="1"
                  value={module.settings.marginBottom ?? module.settings.verticalMargin ?? "0"}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, marginBottom: event.target.value }
                    }))
                  }
                />
                <small>{module.settings.marginBottom ?? module.settings.verticalMargin ?? "0"}px</small>
              </label>
              <label className="field"><span>Level</span><select value={module.settings.level ?? "h2"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, level: event.target.value } }))}><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option><option value="h5">H5</option><option value="h6">H6</option></select></label>
              <label className="field"><span>Size (px)</span><input type="number" min="10" max="160" step="1" value={module.settings.fontSize ?? "32"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, fontSize: event.target.value } }))} /></label>
              <label className="field"><span>Color</span><input type="color" value={module.settings.color ?? "#18324a"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, color: event.target.value } }))} /></label>
              <label className="field"><span>Bold</span><select value={module.settings.bold ?? "true"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, bold: event.target.value } }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label className="field"><span>Italic</span><select value={module.settings.italic ?? "false"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, italic: event.target.value } }))}><option value="false">Off</option><option value="true">On</option></select></label>
              <label className="field"><span>Underline</span><select value={module.settings.underline ?? "false"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, underline: event.target.value } }))}><option value="false">Off</option><option value="true">On</option></select></label>
              <label className="field"><span>Drop shadow</span><select value={module.settings.dropShadow ?? "false"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, dropShadow: event.target.value } }))}><option value="false">Off</option><option value="true">On</option></select></label>
              <label className="field"><span>Shadow color</span><input type="color" value={module.settings.dropShadowColor?.startsWith("#") ? module.settings.dropShadowColor : "#000000"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, dropShadowColor: event.target.value } }))} /></label>
              <label className="field"><span>Shadow X</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowX ?? "3"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, dropShadowX: event.target.value } }))} /></label>
              <label className="field"><span>Shadow Y</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowY ?? "3"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, dropShadowY: event.target.value } }))} /></label>
              <label className="field"><span>Shadow blur</span><input type="number" min="0" max="30" step="1" value={module.settings.dropShadowBlur ?? "2"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, dropShadowBlur: event.target.value } }))} /></label>
              <label className="field"><span>Outline</span><select value={module.settings.outline ?? "false"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, outline: event.target.value } }))}><option value="false">Off</option><option value="true">On</option></select></label>
            </div>
            <BuilderModuleOffsetFields
              horizontalOffset={module.settings.horizontalOffset ?? "0"}
              verticalOffset={module.settings.verticalOffset ?? "0"}
              onHorizontalOffsetChange={(horizontalOffset) =>
                onUpdateModule((current) => ({
                  ...current,
                  settings: { ...current.settings, horizontalOffset }
                }))
              }
              onVerticalOffsetChange={(verticalOffset) =>
                onUpdateModule((current) => ({
                  ...current,
                  settings: { ...current.settings, verticalOffset }
                }))
              }
            />
            </>
          ) : null}

          {module.type === "table" && <TableModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "slider" && <SliderModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "social" && (
            <SocialModuleEditor
              module={module}
              onUpdateModule={onUpdateModule}
              onOpenGallery={onOpenSocialIconGallery}
            />
          )}
          {module.type === "navigation" && <NavModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "headline-rotator" && <HeadlineRotatorModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "social-share" && <SocialShareModuleEditor module={module} onUpdateModule={onUpdateModule} />}

          {module.type === "merch" ? (
            <MerchModuleEditor module={module} products={products} onUpdateModule={onUpdateModule} />
          ) : null}


          {module.type === "code" ? (
            <div className="builder-code-editor-grid">
              <label className="field">
                <span>Label</span>
                <input
                  type="text"
                  value={module.settings.label ?? ""}
                  onChange={(event) =>
                    onUpdateModule((current) => ({
                      ...current,
                      settings: { ...current.settings, label: event.target.value }
                    }))
                  }
                  placeholder="Optional internal label"
                />
              </label>
              <label className="field builder-code-editor-field">
                <span>Embed code / snippet</span>
                <textarea
                  className="builder-textarea builder-code-textarea"
                  value={module.text}
                  onChange={(event) => onUpdateModule((current) => ({ ...current, text: event.target.value }))}
                  placeholder="<iframe ...></iframe>"
                  spellCheck={false}
                />
              </label>
            </div>
          ) : null}

          {(module.type === "previous-results" || module.type === "current-poll" || module.type === "social-share") && (
            <div className="builder-module-runtime-note">
              <strong>Live poll module</strong>
              <p>This module uses the current poll data from the live poll runtime. Use page preview or a live page to test the real behavior.</p>
            </div>
          )}

          {module.type !== "image" &&
          module.type !== "floating-image" &&
          module.type !== "contact-form" &&
          module.type !== "table" &&
          module.type !== "slider" &&
          module.type !== "social" &&
          module.type !== "navigation" &&
          module.type !== "headline-rotator" &&
          module.type !== "social-share" &&
          module.type !== "merch" &&
          module.type !== "code" &&
          module.type !== "previous-results" &&
          module.type !== "current-poll" ? (
            <label className="field">
              <span>{module.type === "button" ? "Button label" : "Content"}</span>
              {module.type === "text" ? (
                <BuilderRichTextEditor value={module.text} onChange={(value) => onUpdateModule((current) => ({ ...current, text: value }))} />
              ) : (
                <textarea className="builder-textarea" value={module.text} onChange={(event) => onUpdateModule((current) => ({ ...current, text: event.target.value }))} placeholder="Enter content" />
              )}
            </label>
          ) : null}
          </>
          )}
        </div>
      ) : null}
    </div>
  );
}
