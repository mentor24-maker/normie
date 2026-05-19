import type { BuilderTemplateModule } from "@/lib/builder-template";
import { BuilderModuleOffsetFields } from "./builder-module-offset-fields";

type BuilderFloatingImageModuleSettingsProps = {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
};

export function BuilderFloatingImageModuleSettings({
  module,
  onUpdateModule
}: BuilderFloatingImageModuleSettingsProps) {
  return (
    <>
      <label className="field">
        <span>Alt text</span>
        <input
          type="text"
          value={module.settings.alt ?? ""}
          onChange={(event) =>
            onUpdateModule((current) => ({
              ...current,
              settings: { ...current.settings, alt: event.target.value }
            }))
          }
          placeholder="Image description"
        />
      </label>
      <div className="builder-image-controls-grid">
        <label className="field">
          <span>Size</span>
          <select
            value={module.settings.size ?? "15"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, size: event.target.value }
              }))
            }
          >
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
        <label className="field">
          <span>Anchor</span>
          <select
            value={module.settings.overlayAnchor ?? "center"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, overlayAnchor: event.target.value }
              }))
            }
          >
            <option value="center">Center</option>
            <option value="top-left">Top left</option>
            <option value="top-center">Top center</option>
            <option value="top-right">Top right</option>
            <option value="center-left">Center left</option>
            <option value="center-right">Center right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-center">Bottom center</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>
        <label className="field">
          <span>Border thickness</span>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={module.settings.borderThickness ?? "0"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, borderThickness: event.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Border color</span>
          <input
            type="color"
            value={module.settings.borderColor ?? "#0f4f8f"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, borderColor: event.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Border radius</span>
          <input
            type="range"
            min="0"
            max="80"
            step="1"
            value={module.settings.borderRadius ?? "18"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, borderRadius: event.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Effect</span>
          <select
            value={module.settings.effect ?? "none"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, effect: event.target.value }
              }))
            }
          >
            <option value="none">None</option>
            <option value="bounce">Bounce</option>
            <option value="spin">Spin</option>
            <option value="cruise">Cruise</option>
            <option value="tumbleweed">Tumbleweed</option>
          </select>
        </label>
      </div>
      <div className="builder-image-controls-grid">
        <label className="field">
          <span>X offset</span>
          <input
            type="number"
            value={module.settings.offsetX ?? "0"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, offsetX: event.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Y offset</span>
          <input
            type="number"
            value={module.settings.offsetY ?? "0"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, offsetY: event.target.value }
              }))
            }
          />
        </label>
        <label className="field">
          <span>Z index</span>
          <select
            value={module.settings.zIndex ?? "20"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, zIndex: event.target.value }
              }))
            }
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </label>
      </div>
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
    </>
  );
}
