

import type { BuilderTemplateModule } from "@/lib/builder-template";

import { DEFAULT_SHARE_TEMPLATE, SOCIAL_SHARE_PLATFORMS, getSocialSharePlatformEnabled, type SocialSharePlatformId } from "@/components/social-share-module";

import { BuilderInlineNumberSelect, BuilderInlineNumberSelectRow } from "./builder-inline-number-select";

export function SocialShareModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function platformSettingKey(platformId: SocialSharePlatformId, suffix: string) {
    return `share${platformId}${suffix}`;
  }

  function getPlatformColor(platformId: SocialSharePlatformId, fallback: string) {
    const color = module.settings[platformSettingKey(platformId, "Color")];
    return color?.startsWith("#") ? color : fallback;
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field">
          <span>Share label</span>
          <input
            type="text"
            value={module.settings.shareLabel ?? "Share this poll"}
            onChange={(event) => updateSetting("shareLabel", event.target.value)}
          />
        </label>
        <label className="field">
          <span>URL override</span>
          <input
            type="text"
            value={module.settings.shareUrl ?? ""}
            onChange={(event) => updateSetting("shareUrl", event.target.value)}
            placeholder="Leave blank to use current page URL"
          />
        </label>
        <label className="field">
          <span>Fallback question</span>
          <input
            type="text"
            value={module.settings.shareFallbackQuestion ?? ""}
            onChange={(event) => updateSetting("shareFallbackQuestion", event.target.value)}
            placeholder="Used only when no current poll is available"
          />
        </label>
        <label className="field">
          <span>Hashtags</span>
          <input
            type="text"
            value={module.settings.shareHashtags ?? ""}
            onChange={(event) => updateSetting("shareHashtags", event.target.value)}
            placeholder="Normie,WYR"
          />
        </label>
        <label className="field">
          <span>X via</span>
          <input
            type="text"
            value={module.settings.shareVia ?? ""}
            onChange={(event) => updateSetting("shareVia", event.target.value)}
            placeholder="Normie765714"
          />
        </label>
        <BuilderInlineNumberSelectRow>
          <BuilderInlineNumberSelect
            label="Label font size"
            value={module.settings.shareLabelSize ?? "14"}
            min={8}
            max={64}
            fallback="14"
            onChange={(value) => updateSetting("shareLabelSize", value)}
          />
          <BuilderInlineNumberSelect
            label="Icon size"
            value={module.settings.shareIconSize ?? "36"}
            min={20}
            max={120}
            step={2}
            fallback="36"
            onChange={(value) => updateSetting("shareIconSize", value)}
          />
        </BuilderInlineNumberSelectRow>
        <label className="field">
          <span>Icon background</span>
          <input
            type="color"
            value={module.settings.shareIconBackground?.startsWith("#") ? module.settings.shareIconBackground : "#ffffff"}
            onChange={(event) => updateSetting("shareIconBackground", event.target.value)}
          />
        </label>
        <BuilderInlineNumberSelectRow>
          <BuilderInlineNumberSelect
            label="Glyph size"
            value={module.settings.shareGlyphSize ?? "20"}
            min={10}
            max={96}
            fallback="20"
            onChange={(value) => updateSetting("shareGlyphSize", value)}
          />
          <BuilderInlineNumberSelect
            label="Icon gap"
            value={module.settings.shareIconGap ?? "12"}
            min={0}
            max={64}
            fallback="12"
            onChange={(value) => updateSetting("shareIconGap", value)}
          />
        </BuilderInlineNumberSelectRow>
      </div>
      <label className="field">
        <span>Default post template</span>
        <textarea
          className="builder-textarea"
          rows={3}
          value={module.settings.shareTemplate ?? DEFAULT_SHARE_TEMPLATE}
          onChange={(event) => updateSetting("shareTemplate", event.target.value)}
          placeholder={DEFAULT_SHARE_TEMPLATE}
        />
      </label>
      <div className="builder-slider-items">
        {SOCIAL_SHARE_PLATFORMS.map((platform) => (
          <div className="builder-slider-item-card" key={platform.id}>
            <div className="builder-slider-item-header">
              <strong>{platform.label}</strong>
              <label className="field builder-checkbox-field">
                <span>Show</span>
                <input
                  type="checkbox"
                  checked={getSocialSharePlatformEnabled(module.settings, platform.id)}
                  onChange={(event) =>
                    updateSetting(platformSettingKey(platform.id, "Enabled"), event.target.checked ? "true" : "false")
                  }
                />
              </label>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field">
                <span>Button color</span>
                <input
                  type="color"
                  value={getPlatformColor(platform.id, platform.color)}
                  onChange={(event) => updateSetting(platformSettingKey(platform.id, "Color"), event.target.value)}
                />
              </label>
              {platform.id === "instagram" ? (
                <label className="field builder-slider-item-grid-full">
                  <span>Instagram URL</span>
                  <input
                    type="text"
                    value={module.settings[platformSettingKey(platform.id, "Url")] ?? ""}
                    onChange={(event) => updateSetting(platformSettingKey(platform.id, "Url"), event.target.value)}
                    placeholder="https://www.instagram.com/your-profile"
                  />
                </label>
              ) : null}
              {platform.supportsText ? (
                <label className="field builder-slider-item-grid-full">
                  <span>Post template</span>
                  <textarea
                    className="builder-textarea"
                    rows={3}
                    value={module.settings[platformSettingKey(platform.id, "Template")] ?? ""}
                    onChange={(event) => updateSetting(platformSettingKey(platform.id, "Template"), event.target.value)}
                    placeholder="Leave blank to use the default template"
                  />
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

