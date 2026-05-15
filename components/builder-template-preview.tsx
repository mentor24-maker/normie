"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BuilderTemplateSection } from "@/lib/builder-template";
import {
  formatRichTextContent,
  getBuilderBackgroundStyle,
  getLayoutColumns,
  getLayoutGridTemplate,
  normalizeBuilderAssetUrl
} from "@/lib/builder-template";
import { PollExperience } from "@/components/poll-experience";
import {
  getAlignmentClass,
  getHeadingModuleStyle,
  getImageModuleStyle,
  getImageOverlayStyle,
  getImagePositionMode,
  getModuleAlignment,
  getModuleBackgroundSettings,
  getVerticalMarginStyle,
  getVideoEmbedSource,
  isVideoMedia
} from "@/components/builder/builder-utils";

type BuilderTemplatePreviewProps = {
  layoutSections: BuilderTemplateSection[];
  pageBackground: import("@/lib/builder-template").BackgroundSettings;
  showShell?: boolean;
};

type ContactFormField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
};

function normalizeNavPath(value: string) {
  const path = value.split("?")[0]?.split("#")[0] || "/";
  const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;

  return normalized === "/home" ? "/" : normalized;
}

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

function ContactFormPreview({ settings }: { settings: Record<string, string> }) {
  const mode = getContactFormMode(settings);
  const fields = getContactFormFields(mode);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          formMode: mode,
          firstName: values.firstName ?? "",
          lastName: values.lastName ?? "",
          email: values.email ?? "",
          phone: values.phone ?? ""
        })
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to submit the form.");
      }

      setMessage(data.message ?? "Thanks. Your information has been saved.");
      setValues({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit the form.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="builder-contact-form" onSubmit={submitContactForm}>
      {message ? <div className="builder-contact-form-message">{message}</div> : null}
      {error ? <div className="builder-contact-form-error">{error}</div> : null}
      <div className="builder-contact-form-fields">
        {fields.map((field) => (
          <label className="builder-contact-form-field" key={field.id}>
            <span>{field.label}</span>
            <input
              type={field.type}
              placeholder={field.label}
              value={values[field.id] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
              required={field.id === "firstName" || field.id === "email"}
            />
          </label>
        ))}
      </div>
      {mode === "custom" ? (
        <div className="builder-contact-form-stub">Custom form builder coming soon. Standard fields are shown for now.</div>
      ) : null}
      <button className="builder-contact-form-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

function MerchProductCard({ settings }: { settings: Record<string, string> }) {
  const productName = settings.productName || "Merch product";
  const imageUrl = normalizeBuilderAssetUrl(settings.imageUrl);
  const productUrl = normalizeBuilderAssetUrl(settings.productUrl);
  const buttonLabel = settings.buttonLabel || "Buy on Redbubble";

  return (
    <div className="product-card">
      {imageUrl ? <img src={imageUrl} alt={productName} /> : null}
      <h3>{productName}</h3>
      {productUrl ? (
        <a href={productUrl} target="_blank" rel="noopener noreferrer">
          {buttonLabel}
        </a>
      ) : null}
    </div>
  );
}

export function BuilderTemplatePreview({
  layoutSections,
  pageBackground,
  showShell = true
}: BuilderTemplatePreviewProps) {
  const pageStyle = getBuilderBackgroundStyle(pageBackground);

  return (
    <div className={showShell ? "builder-preview-shell" : undefined} style={pageStyle}>
      {layoutSections.map((section) => (
        <BuilderSectionPreview key={section.id} section={section} />
      ))}
    </div>
  );
}

function BuilderSectionPreview({ section }: { section: BuilderTemplateSection }) {
  const sectionStyle = getBuilderBackgroundStyle(section.background);
  const columnKeys = getLayoutColumns(section.layout);
  const isNavigationSection = section.modules.length > 0 && section.modules.every((module) => module.type === "navigation");
  const gridStyle: CSSProperties = {
    ...(isNavigationSection ? {} : sectionStyle),
    ...getVerticalMarginStyle(section.verticalMargin),
    display: "grid",
    gridTemplateColumns: getLayoutGridTemplate(section.layout),
    gap: "16px",
    "--builder-layout-grid": getLayoutGridTemplate(section.layout)
  } as CSSProperties;

  return (
    <section
      className={`builder-preview-section builder-preview-section-layout-${section.layout || "single"} builder-preview-section-mobile-${section.mobileLayout || "stack"} ${
        isNavigationSection ? "builder-preview-section-navigation" : ""
      }`}
      style={gridStyle}
    >
      {columnKeys.map((columnKey) => {
        const columnModules = section.modules.filter((module) => module.column === columnKey);
        const isNavigationColumn = columnModules.length > 0 && columnModules.every((module) => module.type === "navigation");
        const columnBackground = section.cellBackgrounds?.[columnKey];
        const padding = section.cellPadding?.[columnKey] ?? "0";
        const verticalMargin = section.cellVerticalMargin?.[columnKey] ?? "0";
        const borderWidth = section.cellBorderWidth?.[columnKey] ?? "0";
        const borderColor = section.cellBorderColor?.[columnKey] ?? "#d9e4ef";
        const borderRadius = section.cellBorderRadius?.[columnKey] ?? "0";
        const columnStyle: CSSProperties = {
          ...(isNavigationColumn || !columnBackground ? {} : getBuilderBackgroundStyle(columnBackground)),
          ...getVerticalMarginStyle(verticalMargin),
          padding: isNavigationColumn ? 0 : `${padding}px`,
          border: isNavigationColumn || Number(borderWidth) <= 0 ? undefined : `${borderWidth}px solid ${borderColor}`,
          borderRadius: isNavigationColumn ? 0 : `${borderRadius}px`,
          position: "relative"
        };

        return (
          <div
            key={columnKey}
            className={`builder-preview-column ${
              section.cellMobileHidden?.[columnKey] === "true" ? "builder-preview-column-mobile-hidden" : ""
            } ${isNavigationColumn ? "builder-preview-column-navigation" : ""}`}
            style={columnStyle}
          >
            {columnModules.map((module) => (
              <div
                key={module.id}
                className={`builder-preview-module ${getAlignmentClass(getModuleAlignment(module.settings))} ${
                  module.settings.mobileHidden === "true" ? "builder-preview-module-mobile-hidden" : ""
                } ${
                  module.settings.mobileAlignment ? `builder-preview-module-mobile-align-${module.settings.mobileAlignment}` : ""
                } ${
                  module.settings.mobileFontSize ? "builder-preview-module-mobile-font-size" : ""
                }`}
                style={{
                  ...(module.type === "navigation" ? {} : getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings)) ?? {}),
                  ...getVerticalMarginStyle(module.settings.verticalMargin),
                  "--builder-mobile-font-size": module.settings.mobileFontSize
                    ? `${module.settings.mobileFontSize}px`
                    : undefined
                } as CSSProperties}
              >
                <BuilderModulePreview module={module} />
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function BuilderModulePreview({ module }: { module: import("@/lib/builder-template").BuilderTemplateModule }) {
  const variant = module.settings.variant ?? "";

  if (module.type === "navigation") {
    return <NavigationModulePreview module={module} />;
  }

  if (module.type === "heading") {
    const Tag = (module.settings.level || "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    return (
      <Tag
        className={`builder-preview-heading builder-preview-heading-${variant || "default"}`}
        style={getHeadingModuleStyle(module.settings)}
      >
        {module.text || ""}
      </Tag>
    );
  }

  if (module.type === "headline-rotator") {
    return <HeadlineRotatorPreview module={module} />;
  }

  if (module.type === "text") {
    return (
      <div
        className={`builder-preview-text builder-preview-text-${variant || "default"}`}
        dangerouslySetInnerHTML={{ __html: formatRichTextContent(module.text) || "" }}
      />
    );
  }

  if (module.type === "code") {
    return (
      <div className={`builder-preview-code builder-preview-code-${variant || "default"}`}>
        {module.settings.label ? (
          <div className="builder-preview-code-label">{module.settings.label}</div>
        ) : null}
        {module.text ? (
          <div
            className="builder-preview-code-render"
            dangerouslySetInnerHTML={{ __html: module.text }}
          />
        ) : null}
      </div>
    );
  }

  if (module.type === "merch") {
    return <MerchProductCard settings={module.settings} />;
  }

  if (module.type === "quote") {
    return (
      <blockquote className={`builder-preview-quote builder-preview-quote-${variant || "default"}`}>
        {module.text || ""}
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
      <Link
        className={`builder-preview-button builder-preview-button-styled builder-preview-button-${variant || "default"} builder-preview-button-${s.buttonSize ?? "medium"}`}
        href={module.settings.href || "#"}
        style={btnStyle}
      >
        {module.text || ""}
      </Link>
    );
  }

  if (module.type === "contact-form") {
    return <ContactFormPreview settings={module.settings} />;
  }

  if (module.type === "video" || (module.type === "image" && module.settings.variant === "video")) {
    const embed = getVideoEmbedSource(module.settings.url);
    const title = module.settings.videoName || module.name || module.text || "Video";
    const opensInNewTab = module.settings.newTab !== "false";

    return (
      <figure className="builder-preview-video-card">
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
          ) : null}
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

  if (module.type === "image") {
    const mediaUrl = normalizeBuilderAssetUrl(module.settings.url);
    const linkUrl = normalizeBuilderAssetUrl(module.settings.linkUrl);
    const imageStyle = getImageModuleStyle(module.settings);
    const imagePositionMode = getImagePositionMode(module.settings);
    const opensInNewTab = module.settings.newTab === "true";
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
        className={`builder-preview-image-shell ${
          imagePositionMode === "overlay" ? "builder-preview-image-shell-overlay" : ""
        }`}
        style={imagePositionMode === "overlay" ? getImageOverlayStyle(module.settings) : undefined}
      >
        <figure
          className={`builder-preview-image builder-preview-image-${variant || "default"}${effectClass}`}
          style={imageStyle}
        >
          {mediaUrl ? (
            isVideoMedia(mediaUrl) ? (
              <video className="builder-preview-video" controls preload="metadata" src={mediaUrl} />
            ) : linkUrl ? (
              <a href={linkUrl} rel={opensInNewTab ? "noopener noreferrer" : undefined} target={opensInNewTab ? "_blank" : undefined}>
                <img
                  alt={module.settings.alt || ""}
                  src={mediaUrl}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "inherit" }}
                />
              </a>
            ) : (
              <img
                alt={module.settings.alt || ""}
                src={mediaUrl}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "inherit" }}
              />
            )
          ) : null}
        </figure>
      </div>
    );
  }

  if (module.type === "table") {
    return <TableModulePreview module={module} />;
  }

  if (module.type === "slider") {
    return <SliderModulePreview module={module} />;
  }

  if (module.type === "social") {
    return <SocialModulePreview module={module} />;
  }

  if (module.type === "previous-results" || module.type === "current-poll") {
    return <PollExperience bare />;
  }

  return null;
}

type HeadlineEntry = {
  id: string;
  label: string;
  href: string;
  xAxis: string;
  yAxis: string;
  color: string;
  overlap: string;
};

function parseHeadlineEntries(raw: string, fallbackColor: string): HeadlineEntry[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          id: String(r.id || `headline-${index + 1}`),
          label: String(r.label || ""),
          href: String(r.href || ""),
          xAxis: String(r.xAxis ?? "50"),
          yAxis: String(r.yAxis ?? "50"),
          color: String(r.color || fallbackColor),
          overlap: String(r.overlap ?? "0")
        };
      })
      .filter((entry) => entry.label.length > 0);
  } catch {
    return [];
  }
}

function HeadlineRotatorPreview({
  module
}: {
  module: import("@/lib/builder-template").BuilderTemplateModule;
}) {
  const color = module.settings.color || "#18324a";
  const entries = useMemo(
    () => parseHeadlineEntries(module.settings.headlines ?? "", color),
    [module.settings.headlines, color]
  );
  const fadeDuration = Math.max(Number.parseInt(module.settings.fadeDuration ?? "800", 10) || 800, 0);
  const displaySpeed = Math.max(Number.parseInt(module.settings.displaySpeed ?? "3000", 10) || 3000, 200);
  const fontSize = Number.parseInt(module.settings.fontSize ?? "32", 10) || 32;
  const isBold = module.settings.bold !== "false";
  const horizontal = getModuleAlignment(module.settings);
  const verticalAlignment =
    (module.settings.verticalAlignment as "top" | "center" | "bottom") || "center";
  const minHeight = Math.max(Number.parseInt(module.settings.minHeight ?? "0", 10) || 0, 0);
  const justify =
    verticalAlignment === "top" ? "flex-start" : verticalAlignment === "bottom" ? "flex-end" : "center";
  const alignSelf =
    horizontal === "left" ? "flex-start" : horizontal === "right" ? "flex-end" : "center";

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVisible, setActiveVisible] = useState(true);
  const [transitionDelay, setTransitionDelay] = useState(0);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (entries.length <= 1) {
      setActiveIndex(0);
      activeIndexRef.current = 0;
      setActiveVisible(true);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const animationFrames: number[] = [];

    function scheduleTimer(callback: () => void, delay: number) {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
      return timer;
    }

    function rotate() {
      if (cancelled) return;
      const currentIndex = activeIndexRef.current % entries.length;
      const current = entries[Math.min(currentIndex, entries.length - 1)];
      const overlap = Math.min(Math.max(Number.parseInt(current?.overlap ?? "0", 10) || 0, 0), fadeDuration);
      const delay = Math.max(fadeDuration - overlap, 0);
      const nextIndex = (currentIndex + 1) % entries.length;

      setTransitionDelay(delay);
      setActiveVisible(false);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);

      const frame = window.requestAnimationFrame(() => {
        if (!cancelled) setActiveVisible(true);
      });
      animationFrames.push(frame);

      scheduleTimer(rotate, displaySpeed);
    }

    scheduleTimer(rotate, displaySpeed);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
    };
  }, [entries, fadeDuration, displaySpeed]);

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: justify,
    minHeight: minHeight ? `${minHeight}px` : undefined,
    textAlign: horizontal,
    color,
    fontSize: `${fontSize}px`,
    fontWeight: isBold ? 700 : 400,
    position: "relative",
    overflow: "visible",
    ...({ textShadow: getHeadingModuleStyle(module.settings).textShadow } as CSSProperties)
  };

  if (entries.length === 0) {
    return (
      <div className="builder-preview-headline-rotator" style={containerStyle}>
        <span style={{ alignSelf }}>Add headlines in the editor</span>
      </div>
    );
  }

  function getPositionedHeadlineStyle(entry: HeadlineEntry, opacity: number, delay = 0): CSSProperties {
    const xAxis = Math.min(Math.max(Number.parseFloat(entry.xAxis) || 50, 0), 100);
    const yAxis = Math.min(Math.max(Number.parseFloat(entry.yAxis) || 50, 0), 100);

    return {
      position: "absolute",
      left: `${xAxis}%`,
      top: `${yAxis}%`,
      transform: "translate(-50%, -50%)",
      transition: `opacity ${fadeDuration}ms ease ${delay}ms`,
      opacity,
      color: entry.color || color,
      pointerEvents: opacity > 0 ? "auto" : "none",
      textDecoration: "none",
      whiteSpace: "nowrap"
    };
  }

  return (
    <div className="builder-preview-headline-rotator" style={containerStyle}>
      {entries.map((entry, index) => {
        const isActive = index === activeIndex;
        const opacity = isActive && activeVisible ? 1 : 0;
        const delay = isActive ? transitionDelay : 0;

        return entry.href ? (
          <Link href={entry.href} key={entry.id} style={getPositionedHeadlineStyle(entry, opacity, delay)}>
            {entry.label}
          </Link>
        ) : (
          <span key={entry.id} style={getPositionedHeadlineStyle(entry, opacity, delay)}>
            {entry.label}
          </span>
        );
      })}
    </div>
  );
}

function NavigationModulePreview({
  module
}: {
  module: import("@/lib/builder-template").BuilderTemplateModule;
}) {
  const variant = module.settings.variant ?? "";
  const pathname = usePathname();
  const activePath = normalizeNavPath(pathname || "/");

  let navItems: { href: string; label: string }[] = [];
  try {
    const parsed = JSON.parse(module.settings.navItems || "[]");
    navItems = Array.isArray(parsed) ? parsed : [];
  } catch {
    navItems = [];
  }

  const fontSize = module.settings.navFontSize ? `${module.settings.navFontSize}px` : undefined;
  const fontWeight = module.settings.navBold === "true" ? 700 : undefined;
  const borderRadius = module.settings.navBorderRadius ? `${module.settings.navBorderRadius}px` : undefined;
  const padding = module.settings.navPadding || undefined;
  const moduleBackgroundStyle = getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings)) ?? {};
  const color = module.settings.navColor || undefined;
  const hoverColor = module.settings.navHoverColor || undefined;
  const hoverBackground = module.settings.navHoverBackground || undefined;

  return (
    <nav
      className={`site-nav builder-preview-nav-${variant || "site-nav"}`}
      aria-label="Main navigation"
      style={
        {
          ...moduleBackgroundStyle,
          fontSize,
          fontWeight,
          borderRadius,
          padding,
          color,
          "--site-nav-link-color": color,
          "--site-nav-link-hover-color": hoverColor,
          "--site-nav-link-hover-bg": hoverBackground
        } as CSSProperties
      }
    >
      {navItems.map((item) => {
        const href = item.href || "#";
        const isActive = normalizeNavPath(href) === activePath;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`site-nav-link${isActive ? " site-nav-link-active" : ""}`}
            href={href}
            key={`${href}-${item.label}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

type ParsedTableData = {
  headers: string[];
  cells: Record<string, import("@/lib/builder-template").BuilderTemplateModule[]>;
  rowCount: number;
};

function parseTableData(settings: Record<string, string>): ParsedTableData {
  try {
    const data = JSON.parse(settings.tableData || "{}");
    const headers: string[] = Array.isArray(data.headers) ? data.headers : [];

    if (data.cells && typeof data.rowCount === "number") {
      return { headers, cells: data.cells as Record<string, import("@/lib/builder-template").BuilderTemplateModule[]>, rowCount: data.rowCount };
    }

    return { headers, cells: {}, rowCount: 1 };
  } catch {
    return { headers: [], cells: {}, rowCount: 1 };
  }
}

function TableModulePreview({ module }: { module: import("@/lib/builder-template").BuilderTemplateModule }) {
  const td = parseTableData(module.settings);
  const borderW = Number.parseInt(module.settings.borderWidth || "1", 10);
  const borderC = module.settings.borderColor || "#cccccc";
  const cellPad = Number.parseInt(module.settings.cellPadding || "8", 10);
  const bgColor = module.settings.backgroundColor || "#ffffff";

  return (
    <div className="builder-preview-table-wrap">
      <table
        className="builder-preview-table"
        style={{ borderCollapse: "collapse", width: "100%", border: `${borderW}px solid ${borderC}`, background: bgColor }}
      >
        {td.headers.length > 0 && (
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i} style={{ border: `${borderW}px solid ${borderC}`, padding: `${cellPad}px`, textAlign: "left", fontWeight: 600 }}>
                  {h}
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
                  <td key={ci} style={{ border: `${borderW}px solid ${borderC}`, padding: `${cellPad}px`, verticalAlign: "top" }}>
                    {cellMods.map((m) => (
                      <BuilderModulePreview key={m.id} module={m} />
                    ))}
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

type SliderItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

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

function SliderModulePreview({ module }: { module: import("@/lib/builder-template").BuilderTemplateModule }) {
  const items = parseSliderItems(module.settings);
  const gap = Number.parseInt(module.settings.sliderGap || "16", 10);
  const cardWidth = Number.parseInt(module.settings.sliderCardWidth || "280", 10);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
  }

  return (
    <div className="builder-preview-slider-wrap">
      {canScrollLeft && (
        <button type="button" className="builder-preview-slider-arrow builder-preview-slider-arrow-left" onClick={() => scroll("left")}>
          ‹
        </button>
      )}
      <div className="builder-preview-slider" ref={scrollRef} style={{ gap: `${gap}px` }}>
        {items.map((item) => (
          <article key={item.id} className="builder-preview-slider-card" style={{ minWidth: `${cardWidth}px` }}>
            {item.imageUrl ? (
              <div className="builder-preview-slider-image">
                <Image alt={item.title || "Slider item"} fill sizes="280px" src={item.imageUrl} unoptimized />
              </div>
            ) : null}
            <div className="builder-preview-slider-copy">
              {item.linkUrl ? (
                <Link href={item.linkUrl}><strong>{item.title}</strong></Link>
              ) : (
                <strong>{item.title}</strong>
              )}
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
      {canScrollRight && (
        <button type="button" className="builder-preview-slider-arrow builder-preview-slider-arrow-right" onClick={() => scroll("right")}>
          ›
        </button>
      )}
    </div>
  );
}

type SocialItem = { id: string; label: string; href: string; iconUrl: string };

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
        iconUrl: normalizeBuilderAssetUrl(raw.iconUrl)
      };
    });
  } catch {
    return [];
  }
}

function SocialModulePreview({ module }: { module: import("@/lib/builder-template").BuilderTemplateModule }) {
  const items = parseSocialItems(module.settings);
  const gap = Number.parseInt(module.settings.socialGap || "14", 10);
  const iconSize = Number.parseInt(module.settings.socialIconSize || "44", 10) * 2;
  const showLabels = module.settings.socialShowLabels !== "false";

  return (
    <div className="builder-preview-social" style={{ gap: `${gap}px` }}>
      {items.map((item) => (
        <a
          key={item.id}
          className="builder-preview-social-item"
          href={item.href || "#"}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="builder-preview-social-icon" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
            {item.iconUrl ? (
              <Image alt={item.label || "Social icon"} fill sizes={`${iconSize}px`} src={item.iconUrl} unoptimized />
            ) : (
              <span>{item.label.slice(0, 1) || "@"}</span>
            )}
          </span>
          {showLabels ? <span>{item.label}</span> : null}
        </a>
      ))}
    </div>
  );
}
