import type { BuilderTemplateModule, BuilderTemplateSection } from "@/lib/builder-template";
import {
  buildReminderCriteriaMetadata,
  normalizeGameReminderAppearance,
  parseReminderCriteriaInput,
  type GameReminder,
  type GameReminderAppearance,
  type GameReminderCriteriaConfig
} from "@/lib/game-reminder";
import { normalizeModuleGameAudience } from "@/lib/module-game-audience";

export const REMINDER_APPEARANCE_SETTING_KEY = "appearance";
export const REMINDER_CRITERIA_LOGIC_SETTING_KEY = "criteriaLogic";
export const REMINDER_CRITERIA_JSON_SETTING_KEY = "reminderCriteriaJson";

export function collectReminderModulesFromLayout(sections: BuilderTemplateSection[]): BuilderTemplateModule[] {
  return sections.flatMap((section) => section.modules.filter((module) => module.type === "reminder"));
}

export function parseReminderCriteriaFromModuleSettings(settings: Record<string, string>): {
  config: ReturnType<typeof parseReminderCriteriaInput>["config"];
  error: string | null;
} {
  let parsedCriteria: unknown = [];

  try {
    parsedCriteria = JSON.parse(settings[REMINDER_CRITERIA_JSON_SETTING_KEY] ?? "[]");
  } catch {
    parsedCriteria = [];
  }

  return parseReminderCriteriaInput({
    criteriaLogic: settings[REMINDER_CRITERIA_LOGIC_SETTING_KEY],
    criteria: parsedCriteria
  });
}

export function builderReminderModuleToEvaluable(module: BuilderTemplateModule): GameReminder {
  const { config } = parseReminderCriteriaFromModuleSettings(module.settings);
  const primaryCriterion = config.criteria[0];
  const appearance = normalizeGameReminderAppearance(module.settings[REMINDER_APPEARANCE_SETTING_KEY]);
  const now = new Date(0).toISOString();

  return {
    id: module.id,
    name: module.name.trim() || "Reminder",
    displayType: appearance === "strip" ? "inline" : "popup",
    appearance,
    messageHtml: module.text ?? "",
    criteriaLogic: config.logic,
    criteria: config.criteria,
    criterionType: primaryCriterion?.type ?? "polls_taken",
    criterionValue: primaryCriterion?.value ?? { operator: "gte", count: 1 },
    audience: normalizeModuleGameAudience(module.settings.gameAudience),
    isActive: module.settings.isActive !== "false",
    sortOrder: Number.parseInt(module.settings.sortOrder ?? "0", 10) || 0,
    metadata: buildReminderModuleMetadata(module.settings, config),
    createdAt: now,
    updatedAt: now
  };
}

export function buildReminderModuleMetadata(
  settings: Record<string, string>,
  config: GameReminderCriteriaConfig
): Record<string, unknown> {
  return {
    ...buildReminderCriteriaMetadata(config),
    backgroundColor: settings.backgroundColor ?? "#ffffff",
    borderColor: settings.borderColor ?? "#4cbb17",
    borderThickness: settings.borderThickness ?? "2",
    containerWidth: settings.containerWidth ?? "520",
    offsetX: settings.offsetX ?? "0",
    offsetY: settings.offsetY ?? "0",
    zIndex: settings.zIndex ?? "46"
  };
}

export function serializeReminderCriteriaToModuleSettings(
  config: ReturnType<typeof parseReminderCriteriaInput>["config"]
): Record<string, string> {
  return {
    [REMINDER_CRITERIA_LOGIC_SETTING_KEY]: config.logic,
    [REMINDER_CRITERIA_JSON_SETTING_KEY]: JSON.stringify(
      config.criteria.map((criterion) => ({
        id: criterion.id,
        type: criterion.type,
        value: criterion.value
      }))
    )
  };
}

export function defaultReminderModuleSettings(): Record<string, string> {
  const { config } = parseReminderCriteriaInput({
    criteriaLogic: "and",
    criteria: [{ id: crypto.randomUUID(), type: "polls_taken", value: { operator: "gte", count: 1 } }]
  });

  return {
    [REMINDER_APPEARANCE_SETTING_KEY]: "speech_bubble" satisfies GameReminderAppearance,
    gameAudience: "both",
    isActive: "true",
    sortOrder: "0",
    backgroundColor: "#ffffff",
    borderColor: "#4cbb17",
    borderThickness: "2",
    containerWidth: "520",
    offsetX: "0",
    offsetY: "0",
    zIndex: "46",
    ...serializeReminderCriteriaToModuleSettings(config)
  };
}
