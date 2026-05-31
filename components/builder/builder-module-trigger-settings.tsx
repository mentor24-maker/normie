"use client";

import type { BuilderTemplateModule } from "@/lib/builder-template";
import {
  getModuleGameAudience,
  MODULE_GAME_AUDIENCE_OPTIONS,
  MODULE_GAME_AUDIENCE_SETTING_KEY,
  normalizeModuleGameAudience
} from "@/lib/module-game-audience";
import { isSupportedGameEventModuleType } from "@/lib/module-class-triggers";
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
  const showGameAudience = trigger === "game" && isSupportedGameEventModuleType(module.type);
  const gameAudience = getModuleGameAudience(module.settings);

  function updateTrigger(updates: Record<string, string>) {
    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...updates,
        [MODULE_TRIGGER_SETTING_KEY]: normalizeModuleTrigger(
          updates[MODULE_TRIGGER_SETTING_KEY] ?? current.settings[MODULE_TRIGGER_SETTING_KEY]
        ),
        [MODULE_GAME_AUDIENCE_SETTING_KEY]: normalizeModuleGameAudience(
          updates[MODULE_GAME_AUDIENCE_SETTING_KEY] ?? current.settings[MODULE_GAME_AUDIENCE_SETTING_KEY]
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

      {showGameAudience ? (
        <BuilderSettingRow label="Audience" fullWidth>
          <select
            value={gameAudience}
            onChange={(event) =>
              updateTrigger({ [MODULE_GAME_AUDIENCE_SETTING_KEY]: event.target.value })
            }
          >
            {MODULE_GAME_AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </BuilderSettingRow>
      ) : null}

      {trigger === "game" ? (
        <p className="panel-copy builder-confetti-game-trigger-note">
          {module.type === "speech-bubble"
            ? "Public Site runs this overlay on builder pages when poll milestones match (including anonymous sessions). Player Portal runs it for logged-in poll progress. Page load still applies when the module is on a live page."
            : "No button is shown on the live page. The game layer calls this module when poll milestones match for the selected audience."}
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
