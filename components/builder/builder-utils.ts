import type { CSSProperties } from "react";
import type {
  BackgroundSettings,
  BuilderPageRecord,
  BuilderTemplateRecord,
  BuilderTemplateSection
} from "@/lib/builder-template";
import {
  createDefaultBackgroundSettings,
  getBuilderBackgroundStyle,
  normalizeBuilderAssetUrl
} from "@/lib/builder-template";
import type { BuilderDraft } from "./builder-types";

export function createDraftFromTemplate(template?: BuilderTemplateRecord | null): BuilderDraft {
  if (!template) {
    return {
      id: "",
      name: "",
      pageBackground: createDefaultBackgroundSettings(),
      layoutSections: []
    };
  }

  return {
    id: template.id,
    name: template.name,
    pageBackground: template.pageBackground,
    layoutSections: template.layoutSections
  };
}

export function createDraftFromPage(page?: BuilderPageRecord | null): BuilderDraft {
  if (!page) {
    return {
      id: "",
      name: "",
      pageBackground: createDefaultBackgroundSettings(),
      layoutSections: []
    };
  }

  return {
    id: page.id,
    name: page.name,
    pageBackground: page.pageBackground,
    layoutSections: page.layoutSections
  };
}

export function getAlignmentClass(alignment: "left" | "center" | "right") {
  if (alignment === "center") {
    return "is-align-center";
  }

  if (alignment === "right") {
    return "is-align-right";
  }

  return "is-align-left";
}

export function getModuleAlignment(settings: Record<string, string>): "left" | "center" | "right" {
  const alignment = settings.alignment;

  if (alignment === "center" || alignment === "right") {
    return alignment;
  }

  return "left";
}

export function getSectionBackgroundStyle(section: BuilderTemplateSection): CSSProperties | undefined {
  return getBuilderBackgroundStyle(section.background);
}

export function getImageModuleStyle(settings: Record<string, string>): CSSProperties {
  const size = Number.parseInt(settings.size ?? "100", 10);
  const borderThickness = Number.parseInt(settings.borderThickness ?? "0", 10);
  const borderRadius = Number.parseInt(settings.borderRadius ?? "18", 10);
  const positionMode = getImagePositionMode(settings);

  return {
    width:
      positionMode === "overlay"
        ? "100%"
        : `${Math.min(Math.max(Number.isFinite(size) ? size : 100, 10), 100)}%`,
    border: `${Math.max(Number.isFinite(borderThickness) ? borderThickness : 0, 0)}px solid ${
      settings.borderColor || "#0f4f8f"
    }`,
    borderRadius: `${Math.max(Number.isFinite(borderRadius) ? borderRadius : 18, 0)}px`
  };
}

export function getImagePositionMode(settings: Record<string, string>): "inline" | "overlay" {
  return settings.positionMode === "overlay" ? "overlay" : "inline";
}

export function getImageOverlayStyle(settings: Record<string, string>): CSSProperties {
  const x = Number.parseInt(settings.offsetX ?? "0", 10);
  const y = Number.parseInt(settings.offsetY ?? "0", 10);
  const zIndex = Number.parseInt(settings.zIndex ?? "2", 10);
  const size = Number.parseInt(settings.size ?? "100", 10);
  const offsetX = Number.isFinite(x) ? x : 0;
  const offsetY = Number.isFinite(y) ? y : 0;
  const anchor = settings.overlayAnchor ?? "center";
  const width = `${Math.min(Math.max(Number.isFinite(size) ? size : 100, 10), 100)}%`;

  const style: CSSProperties = {
    position: "absolute",
    zIndex: Number.isFinite(zIndex) ? zIndex : 2,
    width
  };

  if (anchor === "top-left") {
    style.left = `${offsetX}px`;
    style.top = `${offsetY}px`;
    return style;
  }

  if (anchor === "top-center") {
    style.left = "50%";
    style.top = `${offsetY}px`;
    style.transform = `translateX(calc(-50% + ${offsetX}px))`;
    return style;
  }

  if (anchor === "top-right") {
    style.right = `${offsetX}px`;
    style.top = `${offsetY}px`;
    return style;
  }

  if (anchor === "center-left") {
    style.left = `${offsetX}px`;
    style.top = "50%";
    style.transform = `translateY(calc(-50% + ${offsetY}px))`;
    return style;
  }

  if (anchor === "center-right") {
    style.right = `${offsetX}px`;
    style.top = "50%";
    style.transform = `translateY(calc(-50% + ${offsetY}px))`;
    return style;
  }

  if (anchor === "bottom-left") {
    style.left = `${offsetX}px`;
    style.bottom = `${offsetY}px`;
    return style;
  }

  if (anchor === "bottom-center") {
    style.left = "50%";
    style.bottom = `${offsetY}px`;
    style.transform = `translateX(calc(-50% + ${offsetX}px))`;
    return style;
  }

  if (anchor === "bottom-right") {
    style.right = `${offsetX}px`;
    style.bottom = `${offsetY}px`;
    return style;
  }

  style.left = "50%";
  style.top = "50%";
  style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  return style;
}

export function getModuleBackgroundSettings(settings: Record<string, string>): BackgroundSettings {
  return {
    mode: (settings.backgroundMode as BackgroundSettings["mode"]) || "none",
    color: settings.backgroundColor || "#ffffff",
    color2: settings.backgroundColor2 || "#eaf4ff",
    imageUrl: normalizeBuilderAssetUrl(settings.backgroundImageUrl),
    styleKey: settings.backgroundStyleKey === "blue-yellow-circles" ? "blue-yellow-circles" : ""
  };
}

export function getHeadingModuleStyle(settings: Record<string, string>): CSSProperties {
  const fontSize = Number.parseInt(settings.fontSize ?? "32", 10);
  const color = settings.color || "#18324a";

  // 135 degrees: offset-x = cos(135°) * 5 ≈ -3.54, offset-y = sin(135°) * 5 ≈ 3.54
  const dropShadow = settings.dropShadow === "true"
  ? `2px 2px 3px rgba(0, 0, 0, 0.8)`
  : "none";

  return {
    fontSize: `${Math.max(Number.isFinite(fontSize) ? fontSize : 32, 10)}px`,
    color,
    fontWeight: settings.bold === "false" ? 500 : 800,
    fontStyle: settings.italic === "true" ? "italic" : "normal",
    textDecoration: settings.underline === "true" ? "underline" : "none",
    textDecorationColor: settings.underline === "true" ? color : undefined,
    textShadow: dropShadow,
    WebkitTextStroke: settings.outline === "true" ? `2px ${color}` : undefined
  };
}

export function formatTemplateTimestamp(value: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function isVideoMedia(url: string | undefined) {
  if (!url) {
    return false;
  }

  return /\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i.test(url);
}
