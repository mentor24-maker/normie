"use client";

import { useEffect, type ReactNode } from "react";
import { BlogRichTextEditor } from "@/components/blog-rich-text-editor";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import {
  DEFAULT_DEEP_DIVE_TRIGGER,
  POLL_BACKGROUND_IMAGE_FOCUS_OPTIONS,
  POLL_CONTENT_WIDTH_OPTIONS,
  POLL_POD_BACKGROUND_MODES,
  normalizePollGutterPx,
  normalizePollHeaderFontSize,
  type PollAnswerButtons,
  type PollDeepDiveTriggerSettings,
  type PollPodBackgroundMode,
  type PollPodConfig,
  type PollPodContent,
  type PollPodLayout,
  type PollPodType
} from "@/lib/poll-pod-config";

export function ColorField({
  label,
  allowTransparent = false,
  value,
  onChange
}: {
  label: string;
  allowTransparent?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const isTransparent = value === "transparent";
  const pickerValue = value.startsWith("#") ? value : "#5acff9";

  return (
    <label className="field admin-poll-color-field">
      <span>{label}</span>
      <div className="admin-poll-color-inputs">
        <input
          aria-label={`${label} color picker`}
          disabled={isTransparent}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={pickerValue}
        />
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={allowTransparent ? "#5acff9 or transparent" : "#5acff9"}
          type="text"
          value={value}
        />
      </div>
    </label>
  );
}

function AnswerAbRow({
  columnA,
  columnB,
  onCopyBFromA
}: {
  columnA: ReactNode;
  columnB: ReactNode;
  onCopyBFromA: () => void;
}) {
  return (
    <div className="admin-poll-ab-row">
      {columnA}
      <button
        className="admin-poll-copy-ab"
        onClick={onCopyBFromA}
        title="Copy button A value to button B"
        type="button"
      >
        &gt;&gt;
      </button>
      {columnB}
    </div>
  );
}

export function PollPodLayoutFields({
  layout,
  onChange,
  contentWidthHelp,
  galleryImagePath,
  onGalleryImageConsumed,
  onOpenGallery
}: {
  layout: PollPodLayout;
  onChange: (patch: Partial<PollPodLayout>) => void;
  contentWidthHelp?: string;
  galleryImagePath?: string | null;
  onGalleryImageConsumed?: () => void;
  onOpenGallery?: () => void;
}) {
  useEffect(() => {
    if (!galleryImagePath) {
      return;
    }

    const imageUrl = galleryImagePath.startsWith("/gallery/")
      ? galleryImagePath
      : normalizeBuilderAssetUrl(galleryImagePath);

    onChange({
      podBackgroundMode: "image",
      backgroundImageUrl: imageUrl
    });
    onGalleryImageConsumed?.();
  }, [galleryImagePath, onChange, onGalleryImageConsumed]);

  return (
    <div className="admin-form-grid admin-poll-settings-form">
      <label className="field">
        <span>Pod background</span>
        <select
          onChange={(event) =>
            onChange({ podBackgroundMode: event.target.value as PollPodBackgroundMode })
          }
          value={layout.podBackgroundMode}
        >
          {POLL_POD_BACKGROUND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode === "none"
                ? "None (transparent)"
                : mode === "color"
                  ? "Solid color"
                  : mode === "gradient"
                    ? "Gradient"
                    : "Image"}
            </option>
          ))}
        </select>
      </label>

      {layout.podBackgroundMode === "color" ? (
        <ColorField
          allowTransparent
          label="Background color"
          onChange={(value) => onChange({ podBackgroundColor: value })}
          value={layout.podBackgroundColor}
        />
      ) : null}

      {layout.podBackgroundMode === "gradient" ? (
        <>
          <ColorField
            label="Gradient start"
            onChange={(value) => onChange({ podGradientColor1: value })}
            value={layout.podGradientColor1}
          />
          <ColorField
            label="Gradient end"
            onChange={(value) => onChange({ podGradientColor2: value })}
            value={layout.podGradientColor2}
          />
        </>
      ) : null}

      {layout.podBackgroundMode === "image" ? (
        <div className="admin-poll-background-fields builder-background-controls">
          <label className="field">
            <span>Background image URL</span>
            <input
              onChange={(event) =>
                onChange({ backgroundImageUrl: normalizeBuilderAssetUrl(event.target.value) })
              }
              placeholder="/gallery/... or https://..."
              type="text"
              value={layout.backgroundImageUrl}
            />
          </label>
          {onOpenGallery ? (
            <div className="builder-media-actions">
              <button className="secondary-button builder-gallery-button" onClick={onOpenGallery} type="button">
                Choose background image
              </button>
            </div>
          ) : null}
          <label className="field">
            <span>Image position</span>
            <select
              onChange={(event) => onChange({ backgroundImageFocus: event.target.value })}
              value={layout.backgroundImageFocus}
            >
              {POLL_BACKGROUND_IMAGE_FOCUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="admin-field-help">
              Use Right on Polls pods when content width is narrower, so artwork sits on the right.
            </small>
          </label>
        </div>
      ) : null}
      <ColorField
        label="Header background"
        onChange={(value) => onChange({ headerBackgroundColor: value })}
        value={layout.headerBackgroundColor}
      />
      <ColorField
        label="Header font color"
        onChange={(value) => onChange({ headerFontColor: value })}
        value={layout.headerFontColor}
      />
      <div className="admin-poll-size-settings-row">
        <label className="field">
          <span>Content width</span>
          <select
            onChange={(event) =>
              onChange({ contentWidth: event.target.value as PollPodLayout["contentWidth"] })
            }
            value={layout.contentWidth}
          >
            {POLL_CONTENT_WIDTH_OPTIONS.map((width) => (
              <option key={width} value={width}>
                {width}%
              </option>
            ))}
          </select>
          {contentWidthHelp ? <small className="admin-field-help">{contentWidthHelp}</small> : null}
        </label>
        <label className="field">
          <span>Header font size (rem)</span>
          <input
            max={2.5}
            min={0.75}
            onChange={(event) => onChange({ headerFontSize: event.target.value })}
            step={0.05}
            type="number"
            value={layout.headerFontSize}
          />
        </label>
        <label className="field">
          <span>Pod corner radius (px)</span>
          <input
            max={120}
            min={0}
            onChange={(event) => onChange({ podBorderRadius: event.target.value })}
            step={1}
            type="number"
            value={layout.podBorderRadius}
          />
        </label>
        <label className="field">
          <span>Header corner radius (px)</span>
          <input
            max={999}
            min={0}
            onChange={(event) => onChange({ headerBorderRadius: event.target.value })}
            step={1}
            type="number"
            value={layout.headerBorderRadius}
          />
          <small className="admin-field-help">Use 999 for a pill-shaped header.</small>
        </label>
        <label className="field">
          <span>Header border size (px)</span>
          <input
            max={12}
            min={0}
            onChange={(event) => onChange({ headerBorderSize: event.target.value })}
            step={1}
            type="number"
            value={layout.headerBorderSize}
          />
        </label>
      </div>
      <label className="field admin-poll-gutter-field">
        <span>Gutter (px)</span>
        <input
          max={240}
          min={0}
          onChange={(event) =>
            onChange({ gutterPx: normalizePollGutterPx(event.target.value, layout.gutterPx) })
          }
          step={1}
          type="number"
          value={layout.gutterPx}
        />
        <small className="admin-field-help">Space between the Current Poll and Previous Results columns.</small>
      </label>
      <ColorField
        allowTransparent
        label="Header border color"
        onChange={(value) => onChange({ headerBorderColor: value })}
        value={layout.headerBorderColor}
      />
      <label className="field">
        <span>Header drop shadow</span>
        <select
          onChange={(event) => onChange({ headerDropShadowEnabled: event.target.value })}
          value={layout.headerDropShadowEnabled}
        >
          <option value="false">Off</option>
          <option value="true">On</option>
        </select>
      </label>
      <ColorField
        label="Shadow color"
        onChange={(value) => onChange({ headerDropShadowColor: value })}
        value={layout.headerDropShadowColor}
      />
      <label className="field">
        <span>Shadow opacity (%)</span>
        <input
          max={100}
          min={0}
          onChange={(event) => onChange({ headerDropShadowOpacity: event.target.value })}
          step={1}
          type="number"
          value={layout.headerDropShadowOpacity}
        />
      </label>
      <label className="field">
        <span>Shadow X (px)</span>
        <input
          max={40}
          min={-40}
          onChange={(event) => onChange({ headerDropShadowX: event.target.value })}
          step={1}
          type="number"
          value={layout.headerDropShadowX}
        />
      </label>
      <label className="field">
        <span>Shadow Y (px)</span>
        <input
          max={40}
          min={-40}
          onChange={(event) => onChange({ headerDropShadowY: event.target.value })}
          step={1}
          type="number"
          value={layout.headerDropShadowY}
        />
      </label>
      <label className="field">
        <span>Shadow blur (px)</span>
        <input
          max={60}
          min={0}
          onChange={(event) => onChange({ headerDropShadowBlur: event.target.value })}
          step={1}
          type="number"
          value={layout.headerDropShadowBlur}
        />
      </label>
    </div>
  );
}

export function PollPodAnswerButtonFields({
  buttons,
  onChange
}: {
  buttons: PollAnswerButtons;
  onChange: (patch: Partial<PollAnswerButtons>) => void;
}) {
  return (
    <div className="admin-form-grid admin-poll-settings-form admin-poll-answer-settings">
      <AnswerAbRow
        columnA={
          <ColorField
            label="Button A background"
            onChange={(value) => onChange({ answerButtonABackground: value })}
            value={buttons.answerButtonABackground}
          />
        }
        columnB={
          <ColorField
            label="Button B background"
            onChange={(value) => onChange({ answerButtonBBackground: value })}
            value={buttons.answerButtonBBackground}
          />
        }
        onCopyBFromA={() => onChange({ answerButtonBBackground: buttons.answerButtonABackground })}
      />
      <AnswerAbRow
        columnA={
          <ColorField
            label="Button A font color"
            onChange={(value) => onChange({ answerButtonAFontColor: value })}
            value={buttons.answerButtonAFontColor}
          />
        }
        columnB={
          <ColorField
            label="Button B font color"
            onChange={(value) => onChange({ answerButtonBFontColor: value })}
            value={buttons.answerButtonBFontColor}
          />
        }
        onCopyBFromA={() => onChange({ answerButtonBFontColor: buttons.answerButtonAFontColor })}
      />
      <AnswerAbRow
        columnA={
          <label className="field">
            <span>Button A font size (rem)</span>
            <input
              max={2.5}
              min={0.75}
              onChange={(event) => onChange({ answerButtonAFontSize: event.target.value })}
              step={0.05}
              type="number"
              value={buttons.answerButtonAFontSize}
            />
          </label>
        }
        columnB={
          <label className="field">
            <span>Button B font size (rem)</span>
            <input
              max={2.5}
              min={0.75}
              onChange={(event) => onChange({ answerButtonBFontSize: event.target.value })}
              step={0.05}
              type="number"
              value={buttons.answerButtonBFontSize}
            />
          </label>
        }
        onCopyBFromA={() => onChange({ answerButtonBFontSize: buttons.answerButtonAFontSize })}
      />
      <AnswerAbRow
        columnA={
          <label className="field">
            <span>Button A border size (px)</span>
            <input
              max={12}
              min={0}
              onChange={(event) => onChange({ answerButtonABorderSize: event.target.value })}
              step={1}
              type="number"
              value={buttons.answerButtonABorderSize}
            />
          </label>
        }
        columnB={
          <label className="field">
            <span>Button B border size (px)</span>
            <input
              max={12}
              min={0}
              onChange={(event) => onChange({ answerButtonBBorderSize: event.target.value })}
              step={1}
              type="number"
              value={buttons.answerButtonBBorderSize}
            />
          </label>
        }
        onCopyBFromA={() => onChange({ answerButtonBBorderSize: buttons.answerButtonABorderSize })}
      />
      <AnswerAbRow
        columnA={
          <ColorField
            label="Button A border color"
            onChange={(value) => onChange({ answerButtonABorderColor: value })}
            value={buttons.answerButtonABorderColor}
          />
        }
        columnB={
          <ColorField
            label="Button B border color"
            onChange={(value) => onChange({ answerButtonBBorderColor: value })}
            value={buttons.answerButtonBBorderColor}
          />
        }
        onCopyBFromA={() => onChange({ answerButtonBBorderColor: buttons.answerButtonABorderColor })}
      />
    </div>
  );
}

export function PollPodContentFields({
  content,
  galleryImagePath,
  onChange,
  onGalleryImageConsumed,
  onOpenGallery,
  type
}: {
  content: PollPodContent;
  galleryImagePath: string | null;
  onChange: (patch: Partial<PollPodContent>) => void;
  onGalleryImageConsumed: () => void;
  onOpenGallery: () => void;
  type: PollPodType;
}) {
  return (
    <div className="admin-form-grid admin-poll-settings-form">
      {type === "interstitial" ? (
        <label className="field">
          <span>Header label</span>
          <input
            maxLength={120}
            onChange={(event) => onChange({ headerLabel: event.target.value })}
            placeholder="Announcement"
            value={content.headerLabel}
          />
        </label>
      ) : null}
      <div className="field admin-poll-settings-editor-field">
        <span>Message</span>
        <BlogRichTextEditor
          galleryImagePath={galleryImagePath}
          onChange={(value) => onChange({ contentHtml: value })}
          onGalleryImageConsumed={onGalleryImageConsumed}
          onOpenGallery={onOpenGallery}
          placeholder={
            type === "initial_page" ? "Explain how voting works" : "Promotion or announcement copy"
          }
          value={content.contentHtml}
        />
      </div>
    </div>
  );
}

export function PollDeepDiveTriggerFields({
  trigger,
  onChange
}: {
  trigger: PollDeepDiveTriggerSettings;
  onChange: (patch: Partial<PollDeepDiveTriggerSettings>) => void;
}) {
  return (
    <div className="admin-form-grid admin-poll-settings-form">
      <ColorField
        label="Deep Dive button background"
        value={trigger.backgroundColor}
        onChange={(value) => onChange({ backgroundColor: value })}
      />
      <ColorField
        label="Deep Dive button text"
        value={trigger.fontColor}
        onChange={(value) => onChange({ fontColor: value })}
      />
      <label className="field">
        <span>Deep Dive button font size (rem)</span>
        <input
          max={2.5}
          min={0.75}
          onChange={(event) =>
            onChange({
              fontSizeRem: normalizePollHeaderFontSize(event.target.value, trigger.fontSizeRem)
            })
          }
          step={0.05}
          type="number"
          value={trigger.fontSizeRem}
        />
      </label>
      <ColorField
        label="Deep Dive button hover background"
        value={trigger.hoverBackgroundColor}
        onChange={(value) => onChange({ hoverBackgroundColor: value })}
      />
      <ColorField
        label="Deep Dive button hover text"
        value={trigger.hoverFontColor}
        onChange={(value) => onChange({ hoverFontColor: value })}
      />
      <label className="field">
        <span>Deep Dive button top spacing (px)</span>
        <input
          max={120}
          min={0}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            const next = Number.isFinite(parsed) ? Math.min(120, Math.max(0, parsed)) : 0;
            onChange({ marginTopPx: String(next) });
          }}
          step={1}
          type="number"
          value={trigger.marginTopPx}
        />
      </label>
    </div>
  );
}

export type PollPodConfigPatch = {
  layout?: Partial<PollPodLayout>;
  answerButtons?: Partial<PollAnswerButtons>;
  content?: Partial<PollPodContent>;
  deepDiveTrigger?: Partial<PollDeepDiveTriggerSettings>;
};

export function patchPollPodConfig(config: PollPodConfig, patch: PollPodConfigPatch): PollPodConfig {
  return {
    layout: patch.layout ? { ...config.layout, ...patch.layout } : config.layout,
    answerButtons: patch.answerButtons
      ? ({ ...(config.answerButtons ?? {}), ...patch.answerButtons } as PollAnswerButtons)
      : config.answerButtons,
    content: patch.content
      ? ({ ...(config.content ?? {}), ...patch.content } as PollPodContent)
      : config.content,
    deepDiveTrigger: patch.deepDiveTrigger
      ? ({
          ...DEFAULT_DEEP_DIVE_TRIGGER,
          ...(config.deepDiveTrigger ?? {}),
          ...patch.deepDiveTrigger
        } as PollDeepDiveTriggerSettings)
      : config.deepDiveTrigger
  };
}
