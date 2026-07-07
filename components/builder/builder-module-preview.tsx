import Image from "next/image";

import type { BuilderTemplateModule } from "@/lib/builder-template";
import { normalizeBuilderAssetUrl, formatRichTextContent } from "@/lib/builder-template";

import { sanitizeEmbedHtml } from "@/lib/sanitize-html";
import { HEADLINE_ROTATOR_DEFAULT_FONT_SIZE } from "@/lib/headline-rotator";

import { SocialShareBar } from "@/components/social-share-module";

import { BuilderCodeEmbed } from "./builder-code-embed";

import { parseReminderRecordsFromModule } from "@/lib/builder-reminder-module";
import { SpeechBubblePreview } from "./speech-bubble-preview";

import { BuilderConfettiRuntime } from "@/components/builder-confetti-runtime";

import { BuilderImagePreview } from "./builder-image-preview";

import { getHeadingModuleStyle, getModuleAlignment, getButtonModuleStyle, getVideoEmbedSource } from "./builder-utils";

import { getPlayerPortalAuthSettings, PlayerPortalAuthForm } from "@/components/player-portal-auth-form";

import { PollCategoryListPreview } from "./poll-category-list-preview";

import { parseHeadlineItems, parseSliderItems, parseSocialItems, parseTableData } from "./builder-module-items";

export type ContactFormField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
};

export function getContactFormMode(settings: Record<string, string>): "squeeze" | "standard" | "custom" {
  return settings.formMode === "standard" || settings.formMode === "custom"
    ? settings.formMode
    : "squeeze";
}

export function getContactFormFields(mode: "squeeze" | "standard" | "custom"): ContactFormField[] {
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

export function renderContactFormPreview(settings: Record<string, string>, interactive = false) {
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

export function renderMerchProductCard(settings: Record<string, string>) {
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

export function renderModulePreview(module: BuilderTemplateModule) {
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

  if (module.type === "speech-bubble") {
    return <SpeechBubblePreview classNamePrefix="builder-module-preview" module={module} />;
  }

  if (module.type === "reminder") {
    const recordCount = parseReminderRecordsFromModule(module).length;
    return (
      <div className="builder-module-preview-reminder">
        <p>
          <strong>Reminders</strong> — {recordCount} configured; live overlays when visitor criteria match (not in the
          column layout).
        </p>
      </div>
    );
  }

  if (module.type === "poll-category-list") {
    return (
      <div className="builder-module-preview-copy">
        <PollCategoryListPreview className="builder-module-preview-poll-category-list" module={module} />
      </div>
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
    const btnStyle = getButtonModuleStyle(s);
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

  if (module.type === "player-portal") {
    return (
      <PlayerPortalAuthForm
        settings={getPlayerPortalAuthSettings(module.settings)}
        heading={module.text}
        previewMode
      />
    );
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
    const iconSize = Number.parseInt(module.settings.socialIconSize || "44", 10);
    const showLabels = module.settings.socialShowLabels !== "false";

    return (
      <div className="builder-module-preview-social" style={{ gap: `${gap}px` }}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="builder-module-preview-social-entry">
              <a
                className="builder-module-preview-social-item"
                href={item.href || "#"}
                rel="noopener noreferrer"
                target="_blank"
                aria-label={item.label || "Social link"}
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  background: item.backgroundColor
                }}
              >
                {item.iconUrl ? (
                  <Image alt={item.label || "Social icon"} fill sizes={`${iconSize}px`} src={item.iconUrl} unoptimized />
                ) : (
                  <span className="builder-module-preview-social-fallback">{item.label.slice(0, 1) || "@"}</span>
                )}
              </a>
              {showLabels ? <span className="builder-module-preview-social-label">{item.label || "Social"}</span> : null}
            </div>
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
        <div className="panel-label">Current Question</div>
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

  if (module.type === "confetti") {
    return <BuilderConfettiRuntime preview settings={module.settings} />;
  }

  return (
    <div
      className={`builder-module-preview-paragraph builder-module-preview-text-${variant || "default"}`}
      dangerouslySetInnerHTML={{ __html: formatRichTextContent(module.text) || "<p>Text block</p>" }}
    />
  );
}

export function renderCompactCellModulePreview(module: BuilderTemplateModule) {
  return <div className="builder-table-cell-module-preview">{renderModulePreview(module)}</div>;
}

