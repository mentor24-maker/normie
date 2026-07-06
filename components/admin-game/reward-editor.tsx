import { DEFAULT_BADGE_BACKGROUND_COLOR, RewardDraft, formatGameLevelName, getSublevelsForLevel, readAdminJson, rewardTypeLabel, statusLabel } from "./helpers";
import { Fragment, useMemo, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import { buildRewardSymbolOptions, type RewardSymbolOption } from "@/lib/game-reward-symbol-options";
import { buildRewardDiscVisualFromDraft, getGameRewardDiscVisual } from "@/lib/reward-disc-visual";
import { RewardDiscPreview } from "@/components/reward-disc-preview";

import type { GameLevel, GameLevelName, GameProgressiveFeature, GameReward, GameRewardStatus, GameRewardType } from "@/lib/game-admin";
import { GAME_LEVEL_NAMES, GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";

import { BuilderSettingRow } from "@/components/builder/builder-setting-row";

import { buildNumericSelectWidthStyle, getNumericSelectDigitCountFromOptions } from "@/components/builder/builder-inline-number-select";

export function RewardVisualSummary({ reward }: { reward: GameReward }) {
  const pollVisual = getGameRewardDiscVisual(reward, "pollReward");
  const levelVisual = getGameRewardDiscVisual(reward, "levelReward");

  return (
    <div className="admin-game-reward-visual-summary">
      {[
        ["Poll-Level", pollVisual, "player-portal-reward-disk"],
        ["Level-Level", levelVisual, "player-portal-level-coin"]
      ].map(([label, visual, className]) => (
        <div className="admin-game-reward-visual-item" key={label as string}>
          <RewardDiscPreview
            ariaLabel={`${label as string} reward disk`}
            className={className as string}
            isEarned
            visual={visual as ReturnType<typeof getGameRewardDiscVisual>}
          />
          <span>
            <strong>{label as string}</strong>
            <span>
              {(visual as ReturnType<typeof getGameRewardDiscVisual>).visualColor} /{" "}
              {(visual as ReturnType<typeof getGameRewardDiscVisual>).visualSize}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export const BADGE_STYLE_OPTIONS = ["coin", "jewel", "ribbon", "medal", "trophy"];
export const REWARD_BORDER_WIDTH_OPTIONS = Array.from({ length: 10 }, (_, index) => `${index + 1}px`);
export const REWARD_BORDER_WIDTH_DIGIT_COUNT = getNumericSelectDigitCountFromOptions(REWARD_BORDER_WIDTH_OPTIONS);

export type RewardStyleValues = {
  visualType?: string;
  digitalProduct?: string;
  visualColor?: string;
  visualSize?: string;
  visualBorderColor?: string;
  visualBorderWidth?: string;
  visualSymbolUrl?: string;
};

export function RewardStyleColumn({
  title,
  rewardType,
  values,
  onChange,
  showSymbol = false,
  isUploadingSymbol = false,
  onSymbolFileSelect,
  symbolOptions,
  previewClassName = "player-portal-reward-disk"
}: {
  title: string;
  rewardType: GameRewardType;
  values: RewardStyleValues;
  onChange: (next: RewardStyleValues) => void;
  showSymbol?: boolean;
  isUploadingSymbol?: boolean;
  onSymbolFileSelect?: (file: File | null) => void;
  symbolOptions: RewardSymbolOption[];
  previewClassName?: string;
}) {
  const previewVisual = buildRewardDiscVisualFromDraft(values);
  const selectedSymbolUrl = normalizeBuilderAssetUrl(values.visualSymbolUrl);

  return (
    <div className="admin-game-reward-style-column">
      <h3>{title}</h3>
      <div className="admin-game-reward-disc-live-preview">
        <RewardDiscPreview
          ariaLabel={`${title} preview`}
          className={previewClassName}
          isEarned
          visual={previewVisual}
        />
      </div>
      {rewardType === "badge" ? (
        <BuilderSettingRow fullWidth label="Badge">
          <select
            className="admin-game-reward-field-select"
            value={values.visualType ?? "coin"}
            onChange={(event) => onChange({ ...values, visualType: event.target.value })}
          >
            {BADGE_STYLE_OPTIONS.map((badge) => (
              <option key={badge} value={badge}>{badge}</option>
            ))}
          </select>
        </BuilderSettingRow>
      ) : null}
      {rewardType === "digital" ? (
        <BuilderSettingRow fullWidth label="Product">
          <select
            className="admin-game-reward-field-select"
            value={values.digitalProduct ?? ""}
            onChange={(event) => onChange({ ...values, digitalProduct: event.target.value })}
          >
            <option value="">TBD</option>
          </select>
        </BuilderSettingRow>
      ) : null}
      {showSymbol ? (
        <>
          <BuilderSettingRow fullWidth label="Symbol">
            <select
              className="admin-game-reward-field-wide"
              value={selectedSymbolUrl}
              onChange={(event) => onChange({ ...values, visualSymbolUrl: event.target.value })}
            >
              {symbolOptions.map((option) => (
                <option key={`${option.group}-${option.value || "none"}`} value={option.value}>
                  {option.group === "gallery"
                    ? `Badge Gallery: ${option.label}`
                    : option.group === "in-use"
                      ? `In Use: ${option.label}`
                      : option.label}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Upload">
            <input
              accept="image/*"
              className="admin-game-reward-field-file"
              disabled={isUploadingSymbol}
              onChange={(event) => {
                onSymbolFileSelect?.(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </BuilderSettingRow>
          {isUploadingSymbol ? (
            <p className="admin-field-help admin-game-reward-symbol-help">Uploading symbol...</p>
          ) : null}
          {!selectedSymbolUrl ? (
            <p className="admin-field-help admin-game-reward-symbol-help">
              Choose a gallery image with Type Badge or upload a new symbol. Uploads from here are set to Type Badge
              automatically.
            </p>
          ) : null}
        </>
      ) : null}
      <BuilderSettingRow fullWidth label="Background">
        <input
          aria-label={`${title} background color`}
          type="color"
          value={normalizeBuilderHexColor(values.visualColor, DEFAULT_BADGE_BACKGROUND_COLOR)}
          onChange={(event) => onChange({ ...values, visualColor: event.target.value })}
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Size">
        <input
          className="admin-game-reward-field-short"
          type="text"
          value={values.visualSize ?? "10px"}
          onChange={(event) => onChange({ ...values, visualSize: event.target.value })}
          placeholder="10px"
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Border Color">
        <input
          className="admin-game-reward-field-short"
          type="text"
          value={values.visualBorderColor ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderColor: event.target.value })}
          placeholder="#991b1b"
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Border Width">
        <select
          className="builder-number-select-control"
          style={buildNumericSelectWidthStyle(REWARD_BORDER_WIDTH_DIGIT_COUNT)}
          value={values.visualBorderWidth ?? ""}
          onChange={(event) => onChange({ ...values, visualBorderWidth: event.target.value })}
        >
          <option value="">None</option>
          {REWARD_BORDER_WIDTH_OPTIONS.map((width) => (
            <option key={width} value={width}>{width}</option>
          ))}
        </select>
      </BuilderSettingRow>
    </div>
  );
}

export function RewardEditor({
  draft,
  gameLevels,
  progressiveFeatures,
  galleryMedia,
  rewards,
  isSaving,
  onCancel,
  onChange,
  onSave,
  onGalleryRefresh
}: {
  draft: RewardDraft;
  gameLevels: GameLevel[];
  progressiveFeatures: GameProgressiveFeature[];
  galleryMedia: AdminMediaItem[];
  rewards: GameReward[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: RewardDraft) => void;
  onSave: () => void;
  onGalleryRefresh: () => Promise<void>;
}) {
  const sublevels = getSublevelsForLevel(gameLevels, draft.achievementLevelName);
  const selectedRewardType = draft.rewardType ?? "";
  const [isUploadingPollSymbol, setIsUploadingPollSymbol] = useState(false);
  const [isUploadingLevelSymbol, setIsUploadingLevelSymbol] = useState(false);
  const pollSymbolOptions = useMemo(
    () => buildRewardSymbolOptions(galleryMedia, rewards, draft.pollVisualSymbolUrl),
    [draft.pollVisualSymbolUrl, galleryMedia, rewards]
  );
  const levelSymbolOptions = useMemo(
    () => buildRewardSymbolOptions(galleryMedia, rewards, draft.levelVisualSymbolUrl),
    [draft.levelVisualSymbolUrl, galleryMedia, rewards]
  );

  async function uploadPollSymbol(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingPollSymbol(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("badge", "1");
      formData.append("media_type", "Badge");
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: { path?: string }; error?: string }>(
        response,
        "Failed to upload symbol."
      );

      if (!data.media?.path) {
        throw new Error(data.error ?? "Failed to upload symbol.");
      }

      onChange({ ...draft, pollVisualSymbolUrl: normalizeBuilderAssetUrl(data.media.path) });
      await onGalleryRefresh();
    } finally {
      setIsUploadingPollSymbol(false);
    }
  }

  async function uploadLevelSymbol(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingLevelSymbol(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("badge", "1");
      formData.append("media_type", "Badge");
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: { path?: string }; error?: string }>(
        response,
        "Failed to upload symbol."
      );

      if (!data.media?.path) {
        throw new Error(data.error ?? "Failed to upload symbol.");
      }

      onChange({ ...draft, levelVisualSymbolUrl: normalizeBuilderAssetUrl(data.media.path) });
      await onGalleryRefresh();
    } finally {
      setIsUploadingLevelSymbol(false);
    }
  }

  return (
    <div className="builder-product-editor admin-game-editor admin-game-reward-editor">
      <div className="admin-game-reward-grid">
        <div className="admin-game-reward-definition-column">
          <BuilderSettingRow fullWidth label="Name">
            <input
              className="admin-game-reward-field-medium"
              type="text"
              value={draft.name ?? ""}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder="Grade: First Red"
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Track">
            <select
              className="admin-game-reward-field-select"
              value={draft.achievementLevelName ?? "Grade"}
              onChange={(event) =>
                onChange({
                  ...draft,
                  achievementLevelName: event.target.value as GameLevelName,
                  achievementSublevelName: ""
                })
              }
            >
              {GAME_LEVEL_NAMES.map((levelName) => (
                <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Sublevel">
            <select
              className="admin-game-reward-field-wide"
              value={draft.achievementSublevelName ?? ""}
              onChange={(event) => onChange({ ...draft, achievementSublevelName: event.target.value })}
            >
              <option value="">Select sublevel</option>
              {sublevels.map((sublevel) => (
                <option key={`${sublevel.order}-${sublevel.name}`} value={sublevel.name}>
                  {sublevel.order}. {sublevel.name}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Level">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.levelTier ?? 1}
              onChange={(event) => onChange({ ...draft, levelTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Grade">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.gradeTier ?? 1}
              onChange={(event) => onChange({ ...draft, gradeTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Class">
            <input
              className="admin-game-reward-field-number"
              min="1"
              type="number"
              value={draft.classTier ?? 1}
              onChange={(event) => onChange({ ...draft, classTier: Math.max(1, Number(event.target.value) || 1) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Points">
            <input
              className="admin-game-reward-field-number"
              min="0"
              type="number"
              value={draft.pointsCost ?? 0}
              onChange={(event) => onChange({ ...draft, pointsCost: Number(event.target.value) })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Inventory">
            <input
              className="admin-game-reward-field-number"
              min="0"
              type="number"
              value={draft.inventoryCountText ?? ""}
              onChange={(event) => onChange({ ...draft, inventoryCountText: event.target.value })}
              placeholder="Unlimited"
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Status">
            <select
              className="admin-game-reward-field-select"
              value={draft.status ?? "draft"}
              onChange={(event) => onChange({ ...draft, status: event.target.value as GameRewardStatus })}
            >
              {GAME_REWARD_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Type">
            <select
              className="admin-game-reward-field-select"
              value={selectedRewardType}
              onChange={(event) =>
                onChange({
                  ...draft,
                  rewardType: event.target.value ? (event.target.value as GameRewardType) : undefined
                })
              }
            >
              <option value="">Select Type</option>
              {GAME_REWARD_TYPES.map((type) => (
                <option key={type} value={type}>{rewardTypeLabel(type)}</option>
              ))}
            </select>
          </BuilderSettingRow>
        </div>
        {selectedRewardType ? (
          <>
            {selectedRewardType === "feature" ? (
              <div className="admin-game-reward-style-column">
                <h3>Feature Unlock</h3>
                <BuilderSettingRow fullWidth label="Feature">
                  <select
                    className="admin-game-reward-field-wide"
                    value={draft.featureKey ?? ""}
                    onChange={(event) => onChange({ ...draft, featureKey: event.target.value })}
                  >
                    <option value="">Select feature</option>
                    {progressiveFeatures.map((feature) => (
                      <option key={feature.id} value={feature.featureKey}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </BuilderSettingRow>
                <p className="admin-field-help admin-game-reward-symbol-help">
                  Feature rewards unlock portal capabilities instead of displaying badge styling.
                </p>
              </div>
            ) : null}
            {selectedRewardType !== "feature" ? (
              <>
                <RewardStyleColumn
                  title="Poll-Level Reward"
                  isUploadingSymbol={isUploadingPollSymbol}
                  previewClassName="player-portal-reward-disk"
                  rewardType={selectedRewardType}
                  showSymbol
                  symbolOptions={pollSymbolOptions}
                  values={{
                    visualType: draft.pollVisualType,
                    digitalProduct: draft.pollDigitalProduct,
                    visualColor: draft.pollVisualColor,
                    visualSize: draft.pollVisualSize,
                    visualBorderColor: draft.pollVisualBorderColor,
                    visualBorderWidth: draft.pollVisualBorderWidth,
                    visualSymbolUrl: draft.pollVisualSymbolUrl
                  }}
                  onChange={(next) =>
                    onChange({
                      ...draft,
                      pollVisualType: next.visualType,
                      pollDigitalProduct: next.digitalProduct,
                      pollVisualColor: next.visualColor,
                      pollVisualSize: next.visualSize,
                      pollVisualBorderColor: next.visualBorderColor,
                      pollVisualBorderWidth: next.visualBorderWidth,
                      pollVisualSymbolUrl: next.visualSymbolUrl
                    })
                  }
                  onSymbolFileSelect={(file) => void uploadPollSymbol(file)}
                />
                <RewardStyleColumn
                  title="Level-Level Reward"
                  isUploadingSymbol={isUploadingLevelSymbol}
                  previewClassName="player-portal-level-coin"
                  rewardType={selectedRewardType}
                  showSymbol
                  symbolOptions={levelSymbolOptions}
                  values={{
                    visualType: draft.levelVisualType,
                    digitalProduct: draft.levelDigitalProduct,
                    visualColor: draft.levelVisualColor,
                    visualSize: draft.levelVisualSize,
                    visualBorderColor: draft.levelVisualBorderColor,
                    visualBorderWidth: draft.levelVisualBorderWidth,
                    visualSymbolUrl: draft.levelVisualSymbolUrl
                  }}
                  onChange={(next) =>
                    onChange({
                      ...draft,
                      levelVisualType: next.visualType,
                      levelDigitalProduct: next.digitalProduct,
                      levelVisualColor: next.visualColor,
                      levelVisualSize: next.visualSize,
                      levelVisualBorderColor: next.visualBorderColor,
                      levelVisualBorderWidth: next.visualBorderWidth,
                      levelVisualSymbolUrl: next.visualSymbolUrl
                    })
                  }
                  onSymbolFileSelect={(file) => void uploadLevelSymbol(file)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button admin-blog-add-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Reward"}
        </button>
      </div>
    </div>
  );
}

