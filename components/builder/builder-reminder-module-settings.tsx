"use client";

import { useEffect, useMemo, useState } from "react";
import type { RichTextGalleryBinding } from "@/components/builder/builder-types";
import type { BuilderTemplateModule } from "@/lib/builder-template";
import { normalizeSignedOffsetValue } from "@/lib/builder-template";
import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { AdminGameAudienceField } from "@/components/admin-game-audience-field";
import { BuilderRichTextEditor } from "@/components/builder-rich-text-editor";
import { BuilderNumberSelectControl } from "@/components/builder/builder-inline-number-select";
import { BuilderSettingRow } from "@/components/builder/builder-setting-row";
import { ReminderCriteriaEditor, type ReminderPollOption } from "@/components/reminder-criteria-editor";
import {
  GAME_REMINDER_APPEARANCES,
  createDefaultReminderCriterion,
  parseReminderCriteriaInput,
  reminderAppearanceLabel,
  type GameReminderAppearance,
  type GameReminderCriteriaLogic,
  type GameReminderCriterion
} from "@/lib/game-reminder";
import {
  REMINDER_APPEARANCE_SETTING_KEY,
  REMINDER_CRITERIA_JSON_SETTING_KEY,
  REMINDER_CRITERIA_LOGIC_SETTING_KEY,
  parseReminderCriteriaFromModuleSettings,
  serializeReminderCriteriaToModuleSettings
} from "@/lib/builder-reminder-module";
import type { GameAudience } from "@/lib/game-audience";
import { readAdminJson } from "@/lib/admin-fetch";

type BuilderReminderModuleSettingsProps = {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  richTextGallery?: RichTextGalleryBinding;
};

export function BuilderReminderModuleSettings({
  module,
  onUpdateModule,
  richTextGallery
}: BuilderReminderModuleSettingsProps) {
  const [pollOptions, setPollOptions] = useState<ReminderPollOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPolls() {
      try {
        const response = await fetch("/api/admin/polls", { cache: "no-store" });
        const data = await readAdminJson<{
          polls?: Array<{ id: string; question: string; is_published?: boolean }>;
        }>(response, "Failed to load polls.");

        if (!cancelled) {
          setPollOptions(
            (data.polls ?? []).map((poll) => ({
              id: poll.id,
              question: poll.question,
              isPublished: poll.is_published
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setPollOptions([]);
        }
      }
    }

    void loadPolls();

    return () => {
      cancelled = true;
    };
  }, []);

  const { config } = useMemo(
    () => parseReminderCriteriaFromModuleSettings(module.settings),
    [module.settings]
  );

  const criteria = config.criteria.length > 0 ? config.criteria : [createDefaultReminderCriterion()];

  function updateSettings(updates: Record<string, string>) {
    onUpdateModule((current) => ({
      ...current,
      settings: { ...current.settings, ...updates }
    }));
  }

  function updateCriteriaConfig(nextLogic: GameReminderCriteriaLogic, nextCriteria: GameReminderCriterion[]) {
    const parsed = parseReminderCriteriaInput({
      criteriaLogic: nextLogic,
      criteria: nextCriteria
    });

    if (parsed.error) {
      return;
    }

    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...serializeReminderCriteriaToModuleSettings(parsed.config)
      }
    }));
  }

  return (
    <div className="builder-reminder-module-settings admin-game-reminder-editor">
      <BuilderSettingRow fullWidth label="X Offset">
        <div className="builder-setting-value-stack">
          <input
            type="number"
            value={module.settings.offsetX ?? "0"}
            onChange={(event) =>
              updateSettings({ offsetX: normalizeSignedOffsetValue(event.target.value, "0") })
            }
          />
          <span className="builder-module-offset-hint">Positive moves right; negative moves left.</span>
        </div>
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Y Offset">
        <div className="builder-setting-value-stack">
          <input
            type="number"
            value={module.settings.offsetY ?? "0"}
            onChange={(event) =>
              updateSettings({ offsetY: normalizeSignedOffsetValue(event.target.value, "0") })
            }
          />
          <span className="builder-module-offset-hint">Positive moves up; negative moves down.</span>
        </div>
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Z-Index">
        <div className="builder-setting-value-stack">
          <input
            max={999999}
            min={-999}
            step={1}
            type="number"
            value={module.settings.zIndex ?? "46"}
            onChange={(event) => updateSettings({ zIndex: event.target.value })}
          />
          <span className="builder-module-offset-hint">
            Higher values stack in front (above polls and floating images). Lower values stack behind.
          </span>
        </div>
      </BuilderSettingRow>
      {(module.settings[REMINDER_APPEARANCE_SETTING_KEY] ?? "speech_bubble") === "speech_bubble" ? (
        <BuilderSettingRow fullWidth label="Background Color">
          <div className="builder-setting-value-stack">
            <input
              type="color"
              value={normalizeBuilderHexColor(module.settings.backgroundColor || "#ffffff")}
              onChange={(event) =>
                updateSettings({ backgroundColor: normalizeBuilderHexColor(event.target.value) })
              }
            />
            <span className="builder-module-offset-hint">
              Fills the bubble body and the pointer diamond (same color on both).
            </span>
          </div>
        </BuilderSettingRow>
      ) : null}
      {(module.settings[REMINDER_APPEARANCE_SETTING_KEY] ?? "speech_bubble") === "speech_bubble" ? (
        <>
          <BuilderSettingRow fullWidth label="Border Color">
            <input
              type="color"
              value={normalizeBuilderHexColor(module.settings.borderColor || "#4cbb17")}
              onChange={(event) =>
                updateSettings({ borderColor: normalizeBuilderHexColor(event.target.value) })
              }
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Border Size">
            <BuilderNumberSelectControl
              fallback="2"
              max={24}
              min={0}
              value={module.settings.borderThickness ?? "2"}
              onChange={(borderThickness) => updateSettings({ borderThickness })}
            />
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Container Width">
            <BuilderNumberSelectControl
              fallback="520"
              max={900}
              min={200}
              step={10}
              value={module.settings.containerWidth ?? "520"}
              onChange={(containerWidth) => updateSettings({ containerWidth })}
            />
          </BuilderSettingRow>
        </>
      ) : null}
      <BuilderSettingRow fullWidth label="Appearance">
        <select
          value={module.settings[REMINDER_APPEARANCE_SETTING_KEY] ?? "speech_bubble"}
          onChange={(event) =>
            updateSettings({
              [REMINDER_APPEARANCE_SETTING_KEY]: event.target.value as GameReminderAppearance
            })
          }
        >
          {GAME_REMINDER_APPEARANCES.map((appearance) => (
            <option key={appearance} value={appearance}>
              {reminderAppearanceLabel(appearance)}
            </option>
          ))}
        </select>
      </BuilderSettingRow>
      <AdminGameAudienceField
        value={(module.settings.gameAudience ?? "both") as GameAudience}
        onChange={(audience) => updateSettings({ gameAudience: audience })}
      />
      <ReminderCriteriaEditor
        criteria={criteria}
        criteriaLogic={(module.settings[REMINDER_CRITERIA_LOGIC_SETTING_KEY] ?? config.logic) as GameReminderCriteriaLogic}
        pollOptions={pollOptions}
        onCriteriaChange={(nextCriteria) =>
          updateCriteriaConfig(
            (module.settings[REMINDER_CRITERIA_LOGIC_SETTING_KEY] ?? config.logic) as GameReminderCriteriaLogic,
            nextCriteria
          )
        }
        onCriteriaLogicChange={(logic) => updateCriteriaConfig(logic, criteria)}
      />
      <BuilderSettingRow fullWidth label="Active">
        <label className="admin-game-reminder-active-toggle">
          <input
            checked={module.settings.isActive !== "false"}
            onChange={(event) => updateSettings({ isActive: event.target.checked ? "true" : "false" })}
            type="checkbox"
          />
          <span>Show when criteria match</span>
        </label>
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Message">
        <BuilderRichTextEditor
          value={module.text}
          onChange={(value) => onUpdateModule((current) => ({ ...current, text: value }))}
          {...richTextGallery}
        />
      </BuilderSettingRow>
    </div>
  );
}
