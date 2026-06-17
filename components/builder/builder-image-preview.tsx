import type { CSSProperties } from "react";
import { resolvePublicBuilderAssetUrl } from "@/lib/builder-template";
import type { BuilderTemplateModule } from "@/lib/builder-template";
import {
  getFloatingImageFigureStyle,
  getFloatingImageModuleShellStyle,
  getGameOverlayFloatingImageShellStyle,
  getImageModuleShellStyle,
  getImageModuleStyle,
  isFloatingImageModule,
  isVideoMedia,
  normalizeImageEffect,
  usesHorizontalImageMotionClip
} from "./builder-utils";

export function getImageEffectClassName(effect: string | undefined) {
  const normalized = normalizeImageEffect(effect);

  if (normalized === "bounce") return " normie-effect-bounce";
  if (normalized === "fast-bounce") return " normie-effect-fast-bounce";
  if (normalized === "big-bounce") return " normie-effect-big-bounce";
  if (normalized === "spin") return " normie-effect-spin";
  if (normalized === "flips") return " normie-effect-flips";
  if (normalized === "axis-rotate") return " normie-effect-axis-rotate";
  if (normalized === "slide") return " normie-effect-slide";
  if (normalized === "cartwheels") return " normie-effect-cartwheels";
  if (normalized === "parkour") return " normie-effect-parkour";
  return "";
}

/** Slide / cartwheels / parkour keyframes move ±100vw and can force a horizontal scrollbar that reads like a bottom progress bar. */
export function usesHorizontalMotionClip(effect: string | undefined): boolean {
  return usesHorizontalImageMotionClip(effect);
}

type BuilderImagePreviewProps = {
  module: BuilderTemplateModule;
  variant?: string;
  imageClassName?: string;
  placeholder?: string;
  /** Render in the full-screen game overlay host (above the translucent backdrop). */
  gameOverlayHost?: boolean;
  /** Button-trigger mascot row (stack above poll pods; Z-Index from module settings). */
  sectionScopedDecor?: boolean;
};

export function BuilderImagePreview({
  module,
  variant,
  imageClassName = "builder-preview-image",
  placeholder = "Choose an image",
  gameOverlayHost = false,
  sectionScopedDecor = false
}: BuilderImagePreviewProps) {
  const mediaUrl = resolvePublicBuilderAssetUrl(module.settings.url);
  const linkUrl = isFloatingImageModule(module) ? "" : resolvePublicBuilderAssetUrl(module.settings.linkUrl);
  const floating = isFloatingImageModule(module);
  const effect = normalizeImageEffect(module.settings.effect);
  const imageStyle = floating
    ? getFloatingImageFigureStyle(module.settings, effect)
    : getImageModuleStyle(module.settings);
  const shellStyle = floating
    ? gameOverlayHost
      ? getGameOverlayFloatingImageShellStyle(module.settings)
      : getFloatingImageModuleShellStyle(module.settings, { sectionScopedDecor })
    : getImageModuleShellStyle(module.settings);
  const opensInNewTab = module.settings.newTab === "true";
  const effectClass = getImageEffectClassName(effect);
  const motionClip = usesHorizontalMotionClip(effect);
  const resolvedVariant = variant ?? module.settings.variant ?? "default";

  const figure = (
    <figure
      className={`${imageClassName} builder-preview-image-${resolvedVariant}${effectClass}`}
      style={imageStyle}
    >
      {mediaUrl ? (
        isVideoMedia(mediaUrl) ? (
          <video className="builder-preview-video" controls preload="metadata" src={mediaUrl} />
        ) : linkUrl ? (
          <a href={linkUrl} rel={opensInNewTab ? "noopener noreferrer" : undefined} target={opensInNewTab ? "_blank" : undefined}>
            <img
              alt={module.settings.alt || module.text || ""}
              src={mediaUrl}
              suppressHydrationWarning
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "inherit" }}
            />
          </a>
        ) : (
          <img
            alt={module.settings.alt || module.text || ""}
            src={mediaUrl}
            suppressHydrationWarning
            style={{ width: "100%", height: "auto", display: "block", borderRadius: "inherit" } as CSSProperties}
          />
        )
      ) : (
        <div className="builder-module-preview-placeholder">{placeholder}</div>
      )}
    </figure>
  );

  return (
    <div
      className={`builder-preview-image-shell${floating ? " builder-preview-image-shell-overlay" : ""}`}
      style={shellStyle}
    >
      {motionClip ? <div className="normie-effect-motion-clip">{figure}</div> : figure}
    </div>
  );
}
