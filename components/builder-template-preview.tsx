import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  getBuilderBackgroundStyle,
  createDefaultBackgroundSettings,
  createEmptyModule,
  formatRichTextContent,
  getLayoutColumns,
  getLayoutGridTemplate,
  normalizeBuilderAssetUrl,
  type BackgroundSettings,
  type BuilderTemplateModule,
  type BuilderTemplateRecord,
  type BuilderTemplateSection
} from "@/lib/builder-template";
import { BuilderPollModuleRuntime } from "@/components/builder-poll-runtime";
import {
  getImageModuleStyle,
  getImageOverlayStyle,
  getImagePositionMode,
  getModuleAlignment
} from "@/components/builder/builder-utils";

function getAlignmentClass(alignment: BuilderTemplateSection["alignment"]) {
  if (alignment === "center") {
    return "is-align-center";
  }

  if (alignment === "right") {
    return "is-align-right";
  }

  return "is-align-left";
}

function getSectionBackgroundStyle(section: BuilderTemplateSection): CSSProperties | undefined {
  return getBuilderBackgroundStyle(section.background);
}

function getHeadingModuleStyle(settings: Record<string, string>): CSSProperties {
  const fontSize = Number.parseInt(settings.fontSize ?? "32", 10);

  return {
    fontSize: `${Math.max(Number.isFinite(fontSize) ? fontSize : 32, 10)}px`,
    color: settings.color || "#18324a",
    fontWeight: settings.bold === "false" ? 500 : 800,
    fontStyle: settings.italic === "true" ? "italic" : "normal",
    textDecoration: settings.underline === "true" ? "underline" : "none",
    textShadow: settings.dropShadow === "true" ? "0 2px 10px rgba(9, 16, 24, 0.18)" : "none",
    WebkitTextStroke: settings.outline === "true" ? "1px rgba(9, 16, 24, 0.45)" : undefined
  };
}

function getModuleBackgroundSettings(settings: Record<string, string>): BackgroundSettings {
  return {
    mode: (settings.backgroundMode as BackgroundSettings["mode"]) || "none",
    color: settings.backgroundColor || "#ffffff",
    color2: settings.backgroundColor2 || "#eaf4ff",
    imageUrl: normalizeBuilderAssetUrl(settings.backgroundImageUrl),
    styleKey: settings.backgroundStyleKey === "blue-yellow-circles" ? "blue-yellow-circles" : ""
  };
}

function isVideoMedia(url: string | undefined) {
  if (!url) {
    return false;
  }

  return /\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i.test(url);
}

function parseTableData(settings: Record<string, string>) {
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
      for (let ri = 0; ri < data.rows.length; ri += 1) {
        const row = data.rows[ri];
        if (!Array.isArray(row)) continue;
        for (let ci = 0; ci < row.length; ci += 1) {
          const text = String(row[ci] || "");
          if (!text) continue;
          const mod = createEmptyModule("text", "");
          mod.text = text;
          mod.name = "Text";
          cells[`${ri}-${ci}`] = [mod];
        }
      }
      return { headers, cells, rowCount: data.rows.length };
    }

    return { headers, cells: {}, rowCount: Math.max(Number(data.rowCount) || 0, 1) };
  } catch {
    return { headers: [], cells: {}, rowCount: 1 };
  }
}

function parseSliderItems(settings: Record<string, string>) {
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

function parseSocialItems(settings: Record<string, string>) {
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

function renderTableCellModule(module: BuilderTemplateModule, key: string) {
  const variant = module.settings.variant ?? "";
  const moduleBackgroundStyle = getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings));
  const moduleAlignmentClass = getAlignmentClass(getModuleAlignment(module.settings));

  if (module.type === "heading") {
    const Tag = (module.settings.level || "h3") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

    return (
      <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
        <Tag
          className={`builder-preview-heading builder-preview-heading-${variant || "default"}`}
          style={{ ...getHeadingModuleStyle(module.settings), margin: 0 }}
        >
          {module.text || "Heading"}
        </Tag>
      </div>
    );
  }

  if (module.type === "quote") {
    return (
      <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
        <blockquote className={`builder-preview-quote builder-preview-quote-${variant || "default"}`}>
          {module.text || "Quote"}
        </blockquote>
      </div>
    );
  }

  if (module.type === "button") {
    const bs = module.settings;
    const btnStyle = {
      "--btn-bg": bs.buttonColor || "#214c71",
      "--btn-bg-hover": bs.buttonHoverColor || "#0f4f8f",
      "--btn-color": bs.textColor || "#ffffff",
      "--btn-color-hover": bs.textHoverColor || "#ffffff",
      "--btn-border": bs.borderColor || "#214c71",
      padding: `${bs.paddingY || "12"}px ${bs.paddingX || "24"}px`
    } as CSSProperties;

    return (
      <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
        <a
          className={`builder-preview-button builder-preview-button-styled builder-preview-button-${variant || "default"}`}
          href={bs.href || "#"}
          style={btnStyle}
        >
          {module.text || "Button"}
        </a>
      </div>
    );
  }

  if (module.type === "image") {
    const mediaUrl = normalizeBuilderAssetUrl(module.settings.url);
    const imageStyle = getImageModuleStyle(module.settings);
    const imagePositionMode = getImagePositionMode(module.settings);
    const overlayStyle = imagePositionMode === "overlay" ? getImageOverlayStyle(module.settings) : undefined;

    return (
      <div
        className={`builder-preview-module-shell ${moduleAlignmentClass} ${
          imagePositionMode === "overlay" ? "builder-preview-module-shell-overlay" : ""
        }`}
        key={key}
        style={imagePositionMode === "overlay" ? { ...moduleBackgroundStyle, ...overlayStyle } : moduleBackgroundStyle}
      >
        <figure
          className={`builder-preview-image builder-preview-image-${variant || "default"}`}
          style={imageStyle}
        >
          {mediaUrl ? (
            isVideoMedia(mediaUrl) ? (
              <video className="builder-preview-video" controls preload="metadata" src={mediaUrl} />
            ) : (
              <div className="builder-preview-image-frame">
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
            <div>Image or video URL</div>
          )}
        </figure>
      </div>
    );
  }

  if (module.type === "slider") {
    const items = parseSliderItems(module.settings);
    const gap = Number.parseInt(module.settings.sliderGap || "16", 10);
    const cardWidth = Number.parseInt(module.settings.sliderCardWidth || "280", 10);

    return (
      <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
        <div className="builder-preview-slider" style={{ gap: `${gap}px` }}>
          {items.map((item) => (
            <article key={item.id} className="builder-preview-slider-card" style={{ minWidth: `${cardWidth}px` }}>
              {item.imageUrl ? (
                <div className="builder-preview-slider-image">
                  <Image alt={item.title || "Slider item"} fill sizes="220px" src={item.imageUrl} unoptimized />
                </div>
              ) : null}
              <div className="builder-preview-slider-copy">
                <strong>{item.title || "Slide title"}</strong>
                <p>{item.body || "Slide body"}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (module.type === "social") {
    const items = parseSocialItems(module.settings);
    const gap = Number.parseInt(module.settings.socialGap || "14", 10);
    const iconSize = Number.parseInt(module.settings.socialIconSize || "44", 10) * 2;
    const showLabels = module.settings.socialShowLabels !== "false";

    return (
      <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
        <div className="builder-preview-social" style={{ gap: `${gap}px` }}>
          {items.map((item) => (
            <a key={item.id} className="builder-preview-social-item" href={item.href || "#"}>
              <span className="builder-preview-social-icon" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                {item.iconUrl ? (
                  <Image alt={item.label || "Social icon"} fill sizes={`${iconSize}px`} src={item.iconUrl} unoptimized />
                ) : (
                  <span>{item.label.slice(0, 1) || "@"}</span>
                )}
              </span>
              {showLabels ? <span>{item.label || "Social"}</span> : null}
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (module.type === "previous-results") {
    return (
      <div
        className={`builder-preview-module-shell builder-preview-module-shell-poll ${moduleAlignmentClass}`}
        key={key}
        style={moduleBackgroundStyle}
      >
        <BuilderPollModuleRuntime className="builder-live-poll-module" kind="previous-results" />
      </div>
    );
  }

  if (module.type === "current-poll") {
    return (
      <div
        className={`builder-preview-module-shell builder-preview-module-shell-poll ${moduleAlignmentClass}`}
        key={key}
        style={moduleBackgroundStyle}
      >
        <BuilderPollModuleRuntime className="builder-live-poll-module" kind="current-poll" />
      </div>
    );
  }

  return (
    <div className={`builder-preview-module-shell ${moduleAlignmentClass}`} key={key} style={moduleBackgroundStyle}>
      <div
        className={`builder-preview-text builder-preview-text-${variant || "default"}`}
        dangerouslySetInnerHTML={{ __html: formatRichTextContent(module.text) || "<p>Text block</p>" }}
      />
    </div>
  );
}

export function BuilderTemplatePreview({
  layoutSections,
  pageBackground = createDefaultBackgroundSettings(),
  showShell = true
}: {
  layoutSections: BuilderTemplateRecord["layoutSections"];
  pageBackground?: BackgroundSettings;
  showShell?: boolean;
}) {
  const content = (
    <div className="builder-preview-page" style={getBuilderBackgroundStyle(pageBackground)}>
      <div className="builder-preview">
      {layoutSections.map((section) => {
        const columns = getLayoutColumns(section.layout);

        return (
          <section
            className={`builder-preview-section ${getAlignmentClass(section.alignment)}`}
            key={section.id}
            style={getSectionBackgroundStyle(section)}
          >
            <div
              className={`builder-preview-columns builder-preview-columns-${columns.length}`}
              style={{ gridTemplateColumns: getLayoutGridTemplate(section.layout) }}
            >
              {columns.map((column) => (
                <div
                  className="builder-preview-column"
                  key={column}
                  style={{
                    ...getBuilderBackgroundStyle(section.cellBackgrounds[column]),
                    padding: `${section.cellPadding[column] ?? "18"}px`,
                    borderStyle: "solid",
                    borderWidth: `${section.cellBorderWidth[column] ?? "1"}px`,
                    borderColor: section.cellBorderColor[column] ?? "#d9e4ef",
                    borderRadius: `${section.cellBorderRadius[column] ?? "24"}px`
                  }}
                >
                  {section.modules
                    .filter((module) => module.column === column)
                    .map((module) => {
                      const variant = module.settings.variant ?? "";
                      const moduleBackgroundStyle = getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings));
                      const moduleAlignmentClass = getAlignmentClass(getModuleAlignment(module.settings));

                      let renderedModule: ReactNode;

                      if (module.type === "heading") {
                        const Tag = (module.settings.level || "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
                        renderedModule = (
                          <Tag
                            className={`builder-preview-heading builder-preview-heading-${variant || "default"}`}
                            style={getHeadingModuleStyle(module.settings)}
                          >
                            {module.text || "Heading"}
                          </Tag>
                        );
                      }
                      else if (module.type === "quote") {
                        renderedModule = (
                          <blockquote className={`builder-preview-quote builder-preview-quote-${variant || "default"}`}>
                            {module.text || "Quote"}
                          </blockquote>
                        );
                      } else if (module.type === "button") {
                        const bs = module.settings;
                        const btnStyle = {
                          "--btn-bg": bs.buttonColor || "#214c71",
                          "--btn-bg-hover": bs.buttonHoverColor || "#0f4f8f",
                          "--btn-color": bs.textColor || "#ffffff",
                          "--btn-color-hover": bs.textHoverColor || "#ffffff",
                          "--btn-border": bs.borderColor || "#214c71",
                          padding: `${bs.paddingY || "12"}px ${bs.paddingX || "24"}px`
                        } as CSSProperties;
                        renderedModule = (
                          <a
                            className={`builder-preview-button builder-preview-button-styled builder-preview-button-${variant || "default"}`}
                            href={bs.href || "#"}
                            style={btnStyle}
                          >
                            {module.text || "Button"}
                          </a>
                        );
                      } else if (module.type === "image") {
                        const mediaUrl = normalizeBuilderAssetUrl(module.settings.url);
                        const imageStyle = getImageModuleStyle(module.settings);
                        renderedModule = (
                          <figure
                            className={`builder-preview-image builder-preview-image-${variant || "default"}`}
                            style={imageStyle}
                          >
                            {mediaUrl ? (
                              isVideoMedia(mediaUrl) ? (
                                <video
                                  className="builder-preview-video"
                                  controls
                                  preload="metadata"
                                  src={mediaUrl}
                                />
                              ) : (
                                <div className="builder-preview-image-frame">
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
                              <div>Image or video URL</div>
                            )}
                          </figure>
                        );
                      } else if (module.type === "table") {
                        const parsedTable = parseTableData(module.settings);
                        const borderW = Number.parseInt(module.settings.borderWidth || "1", 10);
                        const borderC = module.settings.borderColor || "#cccccc";
                        const cellPad = Number.parseInt(module.settings.cellPadding || "8", 10);
                        const bgColor = module.settings.backgroundColor || "#ffffff";
                        renderedModule = (
                          <table
                            className="builder-preview-table"
                            style={{
                              borderCollapse: "collapse",
                              width: "100%",
                              border: `${borderW}px solid ${borderC}`,
                              background: bgColor
                            }}
                          >
                            {parsedTable.headers.length > 0 && (
                              <thead>
                                <tr>
                                  {parsedTable.headers.map((h, hi) => (
                                    <th
                                      key={hi}
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
                              {Array.from({ length: parsedTable.rowCount }, (_, ri) => (
                                <tr key={ri}>
                                  {parsedTable.headers.map((_, ci) => {
                                    const cellMods = parsedTable.cells[`${ri}-${ci}`] || [];
                                    return (
                                      <td
                                        key={ci}
                                        style={{
                                          border: `${borderW}px solid ${borderC}`,
                                          padding: `${cellPad}px`,
                                          verticalAlign: "top",
                                          position: "relative"
                                        }}
                                      >
                                        {cellMods.length > 0
                                          ? cellMods.map((cm, cmi) =>
                                              renderTableCellModule(cm as BuilderTemplateModule, `${ri}-${ci}-${cmi}`)
                                            )
                                          : "\u00A0"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      } else if (module.type === "slider") {
                        const items = parseSliderItems(module.settings);
                        const gap = Number.parseInt(module.settings.sliderGap || "16", 10);
                        const cardWidth = Number.parseInt(module.settings.sliderCardWidth || "280", 10);

                        renderedModule = (
                          <div className="builder-preview-slider" style={{ gap: `${gap}px` }}>
                            {items.length > 0 ? (
                              items.map((item) => (
                                <article
                                  key={item.id}
                                  className="builder-preview-slider-card"
                                  style={{ minWidth: `${cardWidth}px` }}
                                >
                                  {item.imageUrl ? (
                                    <div className="builder-preview-slider-image">
                                      <Image
                                        alt={item.title || "Slider item"}
                                        fill
                                        sizes="220px"
                                        src={item.imageUrl}
                                        unoptimized
                                      />
                                    </div>
                                  ) : null}
                                  <div className="builder-preview-slider-copy">
                                    <strong>{item.title || "Slide title"}</strong>
                                    <p>{item.body || "Slide body"}</p>
                                  </div>
                                </article>
                              ))
                            ) : (
                              <div>Slider items</div>
                            )}
                          </div>
                        );
                      } else if (module.type === "social") {
                        const items = parseSocialItems(module.settings);
                        const gap = Number.parseInt(module.settings.socialGap || "14", 10);
                        const iconSize = Number.parseInt(module.settings.socialIconSize || "44", 10) * 2;
                        const showLabels = module.settings.socialShowLabels !== "false";

                        renderedModule = (
                          <div className="builder-preview-social" style={{ gap: `${gap}px` }}>
                            {items.length > 0 ? (
                              items.map((item) => (
                                <a key={item.id} className="builder-preview-social-item" href={item.href || "#"}>
                                  <span className="builder-preview-social-icon" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
                                    {item.iconUrl ? (
                                      <Image
                                        alt={item.label || "Social icon"}
                                        fill
                                        sizes={`${iconSize}px`}
                                        src={item.iconUrl}
                                        unoptimized
                                      />
                                    ) : (
                                      <span>{item.label.slice(0, 1) || "@"}</span>
                                    )}
                                  </span>
                                  {showLabels ? <span>{item.label || "Social"}</span> : null}
                                </a>
                              ))
                            ) : (
                              <div>Social icons</div>
                            )}
                          </div>
                        );
                      } else if (module.type === "previous-results") {
                        renderedModule = (
                          <BuilderPollModuleRuntime className="builder-live-poll-module" kind="previous-results" />
                        );
                      } else if (module.type === "current-poll") {
                        renderedModule = (
                          <BuilderPollModuleRuntime className="builder-live-poll-module" kind="current-poll" />
                        );
                      } else {
                        renderedModule = (
                          <div
                            className={`builder-preview-text builder-preview-text-${variant || "default"}`}
                            dangerouslySetInnerHTML={{ __html: formatRichTextContent(module.text) || "<p>Text block</p>" }}
                          />
                        );
                      }

                      return (
                        <div
                          className={`builder-preview-module-shell ${moduleAlignmentClass} ${
                            module.type === "previous-results" || module.type === "current-poll"
                              ? "builder-preview-module-shell-poll"
                              : ""
                          } ${
                            module.type === "image" && getImagePositionMode(module.settings) === "overlay"
                              ? "builder-preview-module-shell-overlay"
                              : ""
                          }`}
                          key={module.id}
                          style={
                            module.type === "image" && getImagePositionMode(module.settings) === "overlay"
                              ? {
                                  ...moduleBackgroundStyle,
                                  ...getImageOverlayStyle(module.settings)
                                }
                              : moduleBackgroundStyle
                          }
                        >
                          {renderedModule}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );

  if (!showShell) {
    return content;
  }

  return (
    <div className="builder-preview-shell">
      <div className="panel-label">Preview</div>
      {content}
    </div>
  );
}
