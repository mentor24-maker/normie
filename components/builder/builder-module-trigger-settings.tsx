"use client";

import type { BuilderTemplateModule } from "@/lib/builder-template";
import {
  getModuleTrigger,
  MODULE_TRIGGER_OPTIONS,
  MODULE_TRIGGER_SETTING_KEY,
  normalizeModuleTrigger
} from "@/lib/module-trigger";
import { BuilderSettingRow } from "./builder-setting-row";

type BuilderModuleTriggerSettingsProps = {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (module: BuilderTemplateModule) => BuilderTemplateModule) => void;
};

export function BuilderModuleTriggerSettings({
  module,
  onUpdateModule
}: BuilderModuleTriggerSettingsProps) {
  const trigger = getModuleTrigger(module.settings);
  const showButtonLabel = trigger === "button" && module.type === "confetti";

  function updateTrigger(updates: Record<string, string>) {
    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...updates,
        [MODULE_TRIGGER_SETTING_KEY]: normalizeModuleTrigger(
          updates[MODULE_TRIGGER_SETTING_KEY] ?? current.settings[MODULE_TRIGGER_SETTING_KEY]
        )
      }
    }));
  }

  return (
    <div className="builder-module-trigger-settings">
      <BuilderSettingRow label="Trigger" fullWidth>
        <select
          value={trigger}
          onChange={(event) => updateTrigger({ [MODULE_TRIGGER_SETTING_KEY]: event.target.value })}
        >
          {MODULE_TRIGGER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </BuilderSettingRow>

      {trigger === "game" ? (
        <p className="panel-copy builder-confetti-game-trigger-note">
          No button is shown on the live page. The game layer calls this module when the player reaches your
          configured milestone.
        </p>
      ) : null}

      {showButtonLabel ? (
        <BuilderSettingRow label="Button Label" fullWidth>
          <input
            onChange={(event) => updateTrigger({ buttonLabel: event.target.value })}
            type="text"
            value={module.settings.buttonLabel ?? "Confetti"}
          />
        </BuilderSettingRow>
      ) : null}
    </div>
  );
}
