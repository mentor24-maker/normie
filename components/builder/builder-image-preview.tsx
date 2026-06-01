import type { CSSProperties } from "react";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { BuilderTemplateModule } from "@/lib/builder-template";
import {
  getFloatingImageModuleShellStyle,
  getFloatingImageModuleStyle,
  getImageModuleShellStyle,
  getImageModuleStyle,
  isFloatingImageModule,
  isVideoMedia
} from "./builder-utils";

export function getImageEffectClassName(effect: string | undefined) {
  if (effect === "bounce") return " normie-effect-bounce";
  if (effect === "fast-bounce") return " normie-effect-fast-bounce";
  if (effect === "spin") return " normie-effect-spin";
  if (effect === "cruise") return " normie-effect-cruise";
  if (effect === "tumbleweed") return " normie-effect-tumbleweed";
  return "";
}

type BuilderImagePreviewProps = {
  module: BuilderTemplateModule;
  variant?: string;
  imageClassName?: string;
  placeholder?: string;
};

export function BuilderImagePreview({
  module,
  variant,
  imageClassName = "builder-preview-image",
  placeholder = "Choose an image"
}: BuilderImagePreviewProps) {
  const mediaUrl = normalizeBuilderAssetUrl(module.settings.url);
  const linkUrl = isFloatingImageModule(module) ? "" : normalizeBuilderAssetUrl(module.settings.linkUrl);
  const floating = isFloatingImageModule(module);
  const imageStyle = floating ? getFloatingImageModuleStyle(module.settings) : getImageModuleStyle(module.settings);
  const shellStyle = floating ? getFloatingImageModuleShellStyle(module.settings) : getImageModuleShellStyle(module.settings);
  const opensInNewTab = module.settings.newTab === "true";
  const effectClass = getImageEffectClassName(module.settings.effect);
  const resolvedVariant = variant ?? module.settings.variant ?? "default";

  return (
    <div
      className={`builder-preview-image-shell${floating ? " builder-preview-image-shell-overlay" : ""}`}
      style={shellStyle}
    >
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
    </div>
  );
}
