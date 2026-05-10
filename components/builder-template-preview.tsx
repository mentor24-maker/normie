"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
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
  isVideoMedia
} from "@/components/builder/builder-utils";

type BuilderTemplatePreviewProps = {
  layoutSections: BuilderTemplateSection[];
  pageBackground: import("@/lib/builder-template").BackgroundSettings;
  showShell?: boolean;
};

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
  const gridStyle: CSSProperties = {
    ...sectionStyle,
    display: "grid",
    gridTemplateColumns: getLayoutGridTemplate(section.layout),
    gap: "16px"
  };

  return (
    <section
      className={`builder-preview-section builder-preview-section-layout-${section.layout || "single"}`}
      style={gridStyle}
    >
      {columnKeys.map((columnKey) => {
        const columnModules = section.modules.filter((module) => module.column === columnKey);
        const columnBackground = section.cellBackgrounds?.[columnKey];
        const padding = section.cellPadding?.[columnKey] ?? "0";
        const borderWidth = section.cellBorderWidth?.[columnKey] ?? "0";
        const borderColor = section.cellBorderColor?.[columnKey] ?? "#d9e4ef";
        const borderRadius = section.cellBorderRadius?.[columnKey] ?? "0";
        const columnStyle: CSSProperties = {
          ...(columnBackground ? getBuilderBackgroundStyle(columnBackground) : {}),
          padding: `${padding}px`,
          border: Number(borderWidth) > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
          borderRadius: `${borderRadius}px`,
          position: "relative"
        };

        return (
          <div key={columnKey} className="builder-preview-column" style={columnStyle}>
            {columnModules.map((module) => (
              <div
                key={module.id}
                className={`builder-preview-module ${getAlignmentClass(getModuleAlignment(module.settings))}`}
                style={getBuilderBackgroundStyle(getModuleBackgroundSettings(module.settings))}
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
    return <NavigationModulePreview variant={variant} />;
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

type HeadlineEntry = { id: string; label: string; href: string };

function parseHeadlineEntries(raw: string): HeadlineEntry[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          id: String(r.id || `headline-${index + 1}`),
          label: String(r.label || ""),
          href: String(r.href || "")
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
  const entries = parseHeadlineEntries(module.settings.headlines ?? "");
  const fadeDuration = Math.max(Number.parseInt(module.settings.fadeDuration ?? "800", 10) || 800, 0);
  const displaySpeed = Math.max(Number.parseInt(module.settings.displaySpeed ?? "3000", 10) || 3000, 200);
  const fontSize = Number.parseInt(module.settings.fontSize ?? "32", 10) || 32;
  const color = module.settings.color || "#18324a";
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
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (entries.length <= 1) {
      setActiveIndex(0);
      setVisible(true);
      return;
    }

    let cancelled = false;
    const showTimer = window.setTimeout(() => {
      if (cancelled) return;
      setVisible(false);
      window.setTimeout(() => {
        if (cancelled) return;
        setActiveIndex((current) => (current + 1) % entries.length);
        setVisible(true);
      }, fadeDuration);
    }, displaySpeed);

    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
    };
  }, [activeIndex, entries.length, fadeDuration, displaySpeed]);

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: justify,
    minHeight: minHeight ? `${minHeight}px` : undefined,
    textAlign: horizontal,
    color,
    fontSize: `${fontSize}px`,
    fontWeight: isBold ? 700 : 400
  };

  if (entries.length === 0) {
    return (
      <div className="builder-preview-headline-rotator" style={containerStyle}>
        <span style={{ alignSelf }}>Add headlines in the editor</span>
      </div>
    );
  }

  const current = entries[Math.min(activeIndex, entries.length - 1)];
  const innerStyle: CSSProperties = {
    transition: `opacity ${fadeDuration}ms ease`,
    opacity: visible ? 1 : 0,
    alignSelf
  };

  return (
    <div className="builder-preview-headline-rotator" style={containerStyle}>
      {current.href ? (
        <Link href={current.href} style={{ ...innerStyle, color, textDecoration: "none" }}>
          {current.label}
        </Link>
      ) : (
        <span style={innerStyle}>{current.label}</span>
      )}
    </div>
  );
}

function NavigationModulePreview({ variant }: { variant: string }) {
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/tokenomics", label: "Tokenomics" },
    { href: "/roadmap", label: "Roadmap" },
    { href: "/white-paper", label: "White Paper" },
    { href: "/contact", label: "Contact" }
  ];

  return (
    <div className="site-shell-nav-group">
      <div className="site-shell-topbar">
        <Link className="site-shell-logo-link" href="/">
          <Image
            alt="Normie logo"
            className="site-shell-logo"
            priority
            src="/api/admin/media-file/logo_normie_3_1600x500.png"
            width={320}
            height={100}
            unoptimized
          />
        </Link>
        <Link className="site-shell-login-link" href="/admin">
          Login
        </Link>
      </div>
      <nav className={`site-nav builder-preview-nav-${variant || "site-nav"}`} aria-label="Main navigation">
        {navItems.map((item) => (
          <Link className="site-nav-link" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
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
        <a key={item.id} className="builder-preview-social-item" href={item.href || "#"}>
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
