import type { BackgroundSettings } from "@/lib/builder-template";
import {
  BACKGROUND_STYLE_PRESETS,
  createDefaultBackgroundSettings,
  normalizeBuilderAssetUrl
} from "@/lib/builder-template";

type BuilderBackgroundControlsProps = {
  label: string;
  background: BackgroundSettings;
  onChange: (updater: (background: BackgroundSettings) => BackgroundSettings) => void;
  onChooseImage?: () => void;
  onUploadImage?: (file: File | null) => void;
  compact?: boolean;
};

export function BuilderBackgroundControls({
  label,
  background,
  onChange,
  onChooseImage,
  onUploadImage,
  compact = false
}: BuilderBackgroundControlsProps) {
  return (
    <div className="builder-background-controls">
      <div className={compact ? "builder-background-inline-row" : undefined}>
        <label className="field">
          <span>{label}</span>
          <select
            value={background.mode}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                mode: event.target.value as BackgroundSettings["mode"]
              }))
            }
          >
            <option value="none">None</option>
            <option value="color">Color</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image</option>
            <option value="style">Style</option>
          </select>
        </label>

        {background.mode === "color" || background.mode === "gradient" ? (
          <label className="field builder-background-inline-color-field">
            <span>Primary color</span>
            <input
              type="color"
              value={background.color}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  color: event.target.value
                }))
              }
            />
          </label>
        ) : null}

        {background.mode === "gradient" ? (
          <label className="field builder-background-inline-color-field">
            <span>Secondary color</span>
            <input
              type="color"
              value={background.color2}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  color2: event.target.value
                }))
              }
            />
          </label>
        ) : null}

        {background.mode === "style" ? (
          <label className="field builder-background-inline-style-field">
            <span>Style</span>
            <select
              value={background.styleKey}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  styleKey: event.target.value as BackgroundSettings["styleKey"]
                }))
              }
            >
              <option value="">Choose a style</option>
              {BACKGROUND_STYLE_PRESETS.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {background.mode !== "none" ? (
          <div className="builder-background-inline-action">
            <button
              className="secondary-button"
              onClick={() => onChange(() => createDefaultBackgroundSettings())}
              type="button"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {background.mode === "image" ? (
        <div className="builder-section-background-controls">
          <label className="field">
            <span>Background image URL</span>
            <input
              type="text"
              value={background.imageUrl}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  imageUrl: normalizeBuilderAssetUrl(event.target.value)
                }))
              }
              placeholder="https://... or /api/admin/media-file/..."
            />
          </label>
          <div className="builder-media-actions">
            {onChooseImage ? (
              <button
                className="secondary-button builder-gallery-button"
                onClick={onChooseImage}
                type="button"
              >
                Choose Background Image
              </button>
            ) : null}
            {onUploadImage ? (
              <label className="secondary-button builder-gallery-button builder-upload-button">
                <span>Upload Background</span>
                <input
                  className="builder-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    onUploadImage(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
