import { type DragEvent } from "react";
import type { RichTextGalleryBinding } from "@/components/builder/builder-types";
import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";
import type { BackgroundSettings, BuilderProductRecord, BuilderTemplateModule } from "@/lib/builder-template";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { resolveBuilderDrillDownSurfaceBackground } from "@/lib/builder-drill-down-surface";
import { BuilderCollapseIcon } from "./builder-collapse-icon";

import { BuilderRichTextEditor } from "@/components/builder-rich-text-editor";

import { BuilderAlignmentIconGroup } from "./builder-alignment-icon-group";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { MerchModuleEditor } from "./builder-merch-module-editor";

import { BuilderFloatingImageModuleSettings } from "./builder-floating-image-module-settings";
import { BuilderSpeechBubbleModuleSettings } from "./builder-speech-bubble-module-settings";
import { BuilderReminderModuleSettings } from "./builder-reminder-module-settings";

import { getConfettiTrigger } from "@/lib/confetti-effect";
import { getModuleTrigger } from "@/lib/module-trigger";
import { builderModuleShowsTriggerSettings } from "@/lib/module-class-triggers";

import { BuilderConfettiModuleSettings } from "./builder-confetti-module-settings";
import { BuilderModuleTriggerSettings } from "./builder-module-trigger-settings";
import { BuilderCurrentPollModuleSettings } from "./builder-current-poll-module-settings";
import { BuilderSocialModuleSettings } from "./builder-social-module-settings";
import { BuilderModuleOffsetFields } from "./builder-module-offset-fields";

import { getAlignmentClass, getModuleAlignment, getModuleBackgroundSettings, getModuleMarginStyle, getModuleOuterSpacingStyle, getVerticalMarginStyle } from "./builder-utils";
import { BuilderButtonDesignSettings } from "./builder-button-design-settings";
import { BuilderHeadingModuleSettings } from "./builder-heading-module-settings";
import { BuilderPlayerPortalSettings } from "./builder-player-portal-settings";

import { BuilderSettingRow } from "./builder-setting-row";

import { BuilderInlineNumberSelect, BuilderInlineNumberSelectRow, BuilderNumberSelectControl } from "./builder-inline-number-select";
import { getContactFormMode, renderModulePreview } from "./builder-module-preview";
import { TableModuleEditor } from "./builder-table-module-editor";
import { SliderModuleEditor } from "./builder-slider-module-editor";
import { SocialShareModuleEditor } from "./builder-social-share-module-editor";
import { NavModuleEditor } from "./builder-nav-module-editor";
import { PollCategoryListModuleEditor } from "./builder-poll-category-list-editor";
import { HeadlineRotatorModuleEditor } from "./builder-headline-rotator-editor";

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
  onOpenGallery: () => void;
  onOpenRichTextGallery?: (anchor?: BuilderModalAnchor) => void;
  onUploadRichTextGalleryImage?: (file: File) => Promise<string | null>;
  onOpenButtonBackgroundGallery?: () => void;
  onOpenSocialIconGallery: (itemId: string) => void;
  onUploadMedia: (file: File | null) => void;
  onUploadButtonBackgroundMedia?: (file: File | null) => void;
  onClone: () => void;
  onSaveModule?: () => void;
  hideHeaderActions?: boolean;
  isEmailTemplate?: boolean;
  moduleClassOverride?: string;
  onModuleDragStart?: (event: DragEvent<HTMLDivElement>) => void;
};

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
  onOpenRichTextGallery,
  onUploadRichTextGalleryImage,
  onOpenButtonBackgroundGallery,
  onOpenSocialIconGallery,
  onUploadMedia,
  onUploadButtonBackgroundMedia,
  onClone,
  onSaveModule,
  products = [],
  hideHeaderActions = false,
  isEmailTemplate = false,
  moduleClassOverride,
  onModuleDragStart
}: BuilderModuleCardProps) {
    const richTextGalleryProps: RichTextGalleryBinding = {
      onOpenGallery: onOpenRichTextGallery,
      onUploadGalleryImage: onUploadRichTextGalleryImage
    };
    const moduleAlignment = getModuleAlignment(module.settings);
    const mobileAlignment = module.settings.mobileAlignment ?? "";
    const isVideoModule = module.type === "video" || (module.type === "image" && module.settings.variant === "video");
    const isStandardImage = module.type === "image" && !isVideoModule;
    const isFloatingImage = module.type === "floating-image";
    const isReminderModule = module.type === "reminder";
    const isHeadingModule = module.type === "heading";
    const isCurrentPollModule = module.type === "current-poll";
    const isConfettiModule = module.type === "confetti";
    const isSocialModule = module.type === "social";
    const isPollCategoryListModule = module.type === "poll-category-list";
    const isPollRuntimeModule = isCurrentPollModule || module.type === "previous-results";
    const showModuleTriggerSettings = builderModuleShowsTriggerSettings(module, moduleClassOverride);
  return (
    <div
      className={`builder-module-card ${getAlignmentClass(moduleAlignment)}`}
      style={{
        ...(module.type !== "button" && !isPollCategoryListModule
          ? resolveBuilderDrillDownSurfaceBackground(getModuleBackgroundSettings(module.settings), "module")
          : {}),
        ...(isHeadingModule
          ? getModuleMarginStyle(module.settings)
          : module.type === "button"
            ? getModuleOuterSpacingStyle(module.settings)
            : isFloatingImage || isReminderModule
              ? {}
              : getVerticalMarginStyle(module.settings.verticalMargin))
      }}
    >
      {onModuleDragStart ? (
        <div
          aria-label="Drag module"
          className="builder-module-drag-handle"
          draggable
          onDragStart={onModuleDragStart}
          title="Drag Module"
        >
          ⋮⋮
        </div>
      ) : null}
      <div aria-expanded={isExpanded} className="builder-module-header">
        <div className="builder-module-title">
          <div className="builder-module-title-text">
            <strong>{module.name || module.type}</strong>
            <span>{module.type}</span>
          </div>
        </div>
        {hideHeaderActions ? (
          <div className="builder-section-actions">
            <button aria-label={isExpanded ? "Collapse module" : "Expand module"} className="builder-icon-button" onClick={onToggleExpanded} title={isExpanded ? "Collapse module" : "Expand module"} type="button"><BuilderCollapseIcon expanded={isExpanded} /></button>
          </div>
        ) : (
          <div className="builder-section-actions">
            <button aria-label={isExpanded ? "Collapse module" : "Expand module"} className="builder-icon-button" onClick={onToggleExpanded} title={isExpanded ? "Collapse module" : "Expand module"} type="button"><BuilderCollapseIcon expanded={isExpanded} /></button>
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
            {onSaveModule ? (
              <button
                aria-label="Save module"
                className="builder-icon-button"
                onClick={onSaveModule}
                title="Save Module"
                type="button"
              >
                💾
              </button>
            ) : null}
            <button aria-label="Delete module" className="builder-icon-button builder-icon-button-danger" onClick={onRemove} title="Delete module" type="button">✕</button>
          </div>
        )}
      </div>

      {!isExpanded ? (
        <div
          className="builder-module-preview-button"
          role="button"
          tabIndex={0}
          onClick={onToggleExpanded}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleExpanded();
            }
          }}
        >
          {renderModulePreview(module)}
        </div>
      ) : null}

      {isExpanded ? (
        <div className="builder-module-editor">
          <BuilderSettingRow label="Label" fullWidth>
            <input
              type="text"
              value={module.name}
              onChange={(event) => onUpdateModule((current) => ({ ...current, name: event.target.value }))}
              placeholder="Optional internal label"
            />
          </BuilderSettingRow>

          {editorDevice === "mobile" ? (
            <div
              className={
                module.type === "heading"
                  ? "builder-heading-module-settings"
                  : "builder-module-settings-row builder-module-settings-row-mobile"
              }
            >
              <BuilderSettingRow label="Hide Module on Mobile">
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
              </BuilderSettingRow>
              <BuilderSettingRow label="Mobile Alignment">
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
              </BuilderSettingRow>
              {(module.type === "heading" ||
                module.type === "headline-rotator" ||
                module.type === "poll-category-list") ? (
                <BuilderSettingRow label="Mobile Font Size">
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
                </BuilderSettingRow>
              ) : null}
              <div className="builder-mobile-context-note">
                Mobile overrides are kept separate from browser settings.
              </div>
            </div>
          ) : (
          <>
          {showModuleTriggerSettings ? (
            <BuilderModuleTriggerSettings module={module} onUpdateModule={onUpdateModule} />
          ) : null}
          {module.type !== "button" ? (
            isCurrentPollModule ? (
              <BuilderCurrentPollModuleSettings
                module={module}
                onUpdateModule={onUpdateModule}
                onUpdateModuleBackground={onUpdateModuleBackground}
              />
            ) : isConfettiModule ? (
              <BuilderConfettiModuleSettings module={module} onUpdateModule={onUpdateModule} />
            ) : isSocialModule ? (
              <BuilderSocialModuleSettings
                module={module}
                onUpdateModule={onUpdateModule}
                onUpdateModuleBackground={onUpdateModuleBackground}
                onOpenGallery={onOpenSocialIconGallery}
              />
            ) : module.type === "heading" ? (
              <div className="builder-heading-module-chrome">
                <BuilderBackgroundControls
                  label="Background"
                  background={getModuleBackgroundSettings(module.settings)}
                  horizontal
                  onChange={onUpdateModuleBackground}
                />
                <BuilderSettingRow label="Alignment" fullWidth>
                  <BuilderAlignmentIconGroup
                    value={moduleAlignment}
                    onChange={(alignment) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: { ...current.settings, alignment }
                      }))
                    }
                  />
                </BuilderSettingRow>
              </div>
            ) : isPollCategoryListModule ? null : isReminderModule ? null : isFloatingImage ? (
              <div className="builder-floating-image-module-chrome">
                <BuilderBackgroundControls
                  background={getModuleBackgroundSettings(module.settings)}
                  horizontal
                  label="Background"
                  onChange={onUpdateModuleBackground}
                />
              </div>
            ) : (
              <div className="builder-module-chrome">
                <BuilderBackgroundControls
                  label="Background"
                  background={getModuleBackgroundSettings(module.settings)}
                  horizontal
                  onChange={onUpdateModuleBackground}
                />
                <BuilderSettingRow label="Alignment" fullWidth>
                  <BuilderAlignmentIconGroup
                    value={moduleAlignment}
                    onChange={(alignment) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: { ...current.settings, alignment }
                      }))
                    }
                  />
                </BuilderSettingRow>
                <BuilderSettingRow label="Vertical Margin" fullWidth>
                  <BuilderNumberSelectControl
                    fallback="0"
                    max={160}
                    min={0}
                    value={module.settings.verticalMargin ?? "0"}
                    onChange={(verticalMargin) =>
                      onUpdateModule((current) => ({
                        ...current,
                        settings: { ...current.settings, verticalMargin }
                      }))
                    }
                  />
                </BuilderSettingRow>
              </div>
            )
          ) : null}

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

          {(isStandardImage || module.type === "video") && (
            <label className="field">
              <span>{isVideoModule ? "Video embed URL" : "URL"}</span>
              <input
                type="text"
                value={module.settings.url ?? ""}
                onChange={(event) =>
                  onUpdateModule((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      url: normalizeBuilderAssetUrl(event.target.value)
                    }
                  }))
                }
                placeholder={
                  isVideoModule
                    ? "YouTube, Vimeo, embed URL, or uploaded video"
                    : "https://..."
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

          {module.type === "button" ? (
            <BuilderButtonDesignSettings
              isEmailTemplate={isEmailTemplate}
              module={module}
              onUpdateModule={onUpdateModule}
              onOpenButtonBackgroundGallery={onOpenButtonBackgroundGallery}
              onUploadButtonBackgroundMedia={onUploadButtonBackgroundMedia}
            />
          ) : null}

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

          {module.type === "player-portal" ? (
            <BuilderPlayerPortalSettings module={module} onUpdateModule={onUpdateModule} />
          ) : null}

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

          {(isStandardImage || module.type === "video") ? (
            <div className="builder-media-actions">
              <button className="secondary-button builder-gallery-button" onClick={onOpenGallery} type="button">Choose From Gallery</button>
              <label className="secondary-button builder-gallery-button builder-upload-button">
                <span>Upload To Gallery</span>
                <input className="builder-upload-input" type="file" accept="image/*,video/*" onChange={(event) => { onUploadMedia(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
              </label>
            </div>
          ) : null}

          {isFloatingImage ? (
            <BuilderFloatingImageModuleSettings
              module={module}
              onOpenGallery={onOpenGallery}
              onUploadMedia={onUploadMedia}
              onUpdateModule={onUpdateModule}
            />
          ) : null}

          {module.type === "speech-bubble" ? (
            <BuilderSpeechBubbleModuleSettings
              module={module}
              onUpdateModule={onUpdateModule}
              richTextGallery={richTextGalleryProps}
            />
          ) : null}

          {module.type === "reminder" ? (
            <BuilderReminderModuleSettings
              module={module}
              onUpdateModule={onUpdateModule}
              richTextGallery={richTextGalleryProps}
            />
          ) : null}

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
                <BuilderInlineNumberSelectRow>
                  <BuilderInlineNumberSelect
                    label="Border thickness"
                    value={module.settings.borderThickness ?? "0"}
                    min={0}
                    max={24}
                    fallback="0"
                    onChange={(borderThickness) =>
                      onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderThickness } }))
                    }
                  />
                  <BuilderInlineNumberSelect
                    label="Border radius"
                    value={module.settings.borderRadius ?? "18"}
                    min={0}
                    max={80}
                    fallback="18"
                    onChange={(borderRadius) =>
                      onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderRadius } }))
                    }
                  />
                </BuilderInlineNumberSelectRow>
                <label className="field"><span>Border color</span><input type="color" value={module.settings.borderColor ?? "#0f4f8f"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, borderColor: event.target.value } }))} /></label>
                <label className="field">
                  <span>Effect</span>
                  <select value={module.settings.effect ?? "none"} onChange={(event) => onUpdateModule((current) => ({ ...current, settings: { ...current.settings, effect: event.target.value } }))}>
                    <option value="none">None</option>
                    <option value="bounce">Bounce</option>
                    <option value="fast-bounce">Fast Bounce</option>
                    <option value="big-bounce">Big Bounce</option>
                    <option value="spin">Spin</option>
                    <option value="flips">Flips</option>
                    <option value="axis-rotate">Axis Rotate</option>
                    <option value="slide">Slide</option>
                    <option value="cartwheels">Cartwheels</option>
                    <option value="parkour">Parkour</option>
                  </select>
                </label>
              </div>
            </>
          ) : null}

          {module.type === "heading" ? (
            <BuilderHeadingModuleSettings module={module} onUpdateModule={onUpdateModule} />
          ) : null}

          {module.type === "table" && <TableModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "slider" && <SliderModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "navigation" && <NavModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "headline-rotator" && <HeadlineRotatorModuleEditor module={module} onUpdateModule={onUpdateModule} />}
          {module.type === "poll-category-list" && (
            <PollCategoryListModuleEditor
              module={module}
              onUpdateModule={onUpdateModule}
              onUpdateModuleBackground={onUpdateModuleBackground}
            />
          )}
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

          {module.type === "confetti" ? (
            <div className="builder-module-runtime-note">
              <strong>Special effect</strong>
              <p>
                {getConfettiTrigger(module.settings) === "game"
                  ? "Game trigger: no on-page button. Use page preview to test, then wire the game layer to fireConfettiFromModuleSettings with these settings."
                  : "Use page preview or a live page to test the confetti burst. Adjust particle settings in the fields above."}
              </p>
            </div>
          ) : null}

          {module.type === "speech-bubble" ? (
            <div className="builder-module-runtime-note">
              <strong>Speech bubble</strong>
              <p>
                {getModuleTrigger(module.settings) === "game"
                  ? "Game trigger: overlay on the live site at page load and when portal game events fire (logged-in milestones)."
                  : getModuleTrigger(module.settings) === "on-load"
                    ? "Page load trigger: overlay when this page loads on the live site."
                    : "Use page preview or a live page to test this speech bubble overlay."}
              </p>
            </div>
          ) : null}

          {module.type === "floating-image" ? (
            <div className="builder-module-runtime-note">
              <strong>Floating image</strong>
              <p>
                {getModuleTrigger(module.settings) === "game"
                  ? "Game trigger: the image and translucent backdrop render in the full-screen overlay layer (not in the page row). Z-index on the module stacks above that backdrop."
                  : getModuleTrigger(module.settings) === "on-load"
                    ? "Page load trigger: fires in the overlay layer when this page loads on the live site."
                    : "Decorative overlays stay in the page row. Use Test Floating Image in page preview for game-style triggers."}
              </p>
            </div>
          ) : null}

          {module.type === "reminder" ? (
            <div className="builder-module-runtime-note">
              <strong>Reminders</strong>
              <p>
                One module per page holds every reminder. Records sort by question number (poll order or polls-taken count).
                Overlays appear on the live site and in page preview when criteria match. Dismisses on the visitor&apos;s
                next click.
              </p>
            </div>
          ) : null}

          {module.type !== "image" &&
          module.type !== "floating-image" &&
          module.type !== "contact-form" &&
          module.type !== "player-portal" &&
          module.type !== "table" &&
          module.type !== "slider" &&
          module.type !== "social" &&
          module.type !== "navigation" &&
          module.type !== "headline-rotator" &&
          module.type !== "poll-category-list" &&
          module.type !== "social-share" &&
          module.type !== "merch" &&
          module.type !== "code" &&
          module.type !== "previous-results" &&
          module.type !== "current-poll" &&
          module.type !== "confetti" &&
          module.type !== "speech-bubble" &&
          module.type !== "reminder" &&
          module.type !== "button" &&
          module.type !== "heading" ? (
            <label className="field">
              <span>Content</span>
              {module.type === "text" ? (
                <BuilderRichTextEditor
                  value={module.text}
                  onChange={(value) => onUpdateModule((current) => ({ ...current, text: value }))}
                  {...richTextGalleryProps}
                />
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
