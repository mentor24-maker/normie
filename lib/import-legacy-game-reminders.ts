import {
  collectReminderModulesFromLayout,
  createDefaultReminderRecord,
  parseReminderRecordsFromModule,
  REMINDER_RECORDS_JSON_SETTING_KEY,
  serializeReminderRecords,
  type BuilderReminderRecord
} from "@/lib/builder-reminder-module";
import { resolveReminderLayoutSettings } from "@/lib/game-reminder-presentation";
import type { GameReminder } from "@/lib/game-reminder";
import {
  createEmptyModule,
  createEmptySection,
  type BuilderPageRecord,
  type BuilderTemplateModule,
  type BuilderTemplateSection
} from "@/lib/builder-template";

export type LegacyReminderImportResult = {
  layoutSections: BuilderTemplateSection[];
  reminderModuleId: string;
  createdReminderModule: boolean;
  importedCount: number;
  skippedCount: number;
  totalBuilderRecords: number;
};

export function builderReminderRecordFromGameReminder(reminder: GameReminder): BuilderReminderRecord {
  const layout = resolveReminderLayoutSettings(reminder.metadata);

  return {
    id: reminder.id,
    name: reminder.name,
    messageHtml: reminder.messageHtml,
    appearance: reminder.appearance,
    gameAudience: reminder.audience,
    isActive: reminder.isActive,
    sortOrder: reminder.sortOrder,
    criteriaLogic: reminder.criteriaLogic,
    criteria: reminder.criteria.map((criterion) => ({
      id: criterion.id,
      type: criterion.type,
      value: criterion.value
    })),
    backgroundColor: layout.backgroundColor ?? "#ffffff",
    borderColor: layout.borderColor ?? "#4cbb17",
    borderThickness: layout.borderThickness ?? "2",
    containerWidth: layout.containerWidth ?? "520",
    offsetX: layout.offsetX ?? "0",
    offsetY: layout.offsetY ?? "0",
    zIndex: layout.zIndex ?? "46"
  };
}

function mergeReminderRecords(
  existing: BuilderReminderRecord[],
  incoming: BuilderReminderRecord[]
): { records: BuilderReminderRecord[]; importedCount: number; skippedCount: number } {
  const byId = new Map(existing.map((record) => [record.id, record]));
  let importedCount = 0;
  let skippedCount = 0;

  for (const record of incoming) {
    if (byId.has(record.id)) {
      skippedCount += 1;
      continue;
    }

    byId.set(record.id, record);
    importedCount += 1;
  }

  return {
    records: Array.from(byId.values()),
    importedCount,
    skippedCount
  };
}

function updateReminderModule(
  sections: BuilderTemplateSection[],
  moduleId: string,
  records: BuilderReminderRecord[]
): BuilderTemplateSection[] {
  const serialized = serializeReminderRecords(records);

  return sections.map((section) => ({
    ...section,
    modules: section.modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            name: module.name.trim() || "Reminders",
            text: "",
            settings: {
              ...module.settings,
              [REMINDER_RECORDS_JSON_SETTING_KEY]: serialized
            }
          }
        : module
    )
  }));
}

function insertReminderModule(sections: BuilderTemplateSection[]): {
  sections: BuilderTemplateSection[];
  module: BuilderTemplateModule;
} {
  const module = {
    ...createEmptyModule("reminder", "main"),
    id: crypto.randomUUID(),
    name: "Reminders"
  };

  if (sections.length === 0) {
    return {
      sections: [{ ...createEmptySection("single"), modules: [module] }],
      module
    };
  }

  const nextSections = sections.map((section, index) =>
    index === 0
      ? {
          ...section,
          modules: [...section.modules, module]
        }
      : section
  );

  return { sections: nextSections, module };
}

export function importLegacyGameRemindersIntoPageLayout(
  layoutSections: BuilderTemplateSection[],
  legacyReminders: GameReminder[]
): LegacyReminderImportResult {
  const incoming = legacyReminders.map((reminder) => builderReminderRecordFromGameReminder(reminder));
  let sections = layoutSections;
  let reminderModules = collectReminderModulesFromLayout(sections);
  let createdReminderModule = false;
  let reminderModuleId: string;

  if (reminderModules.length === 0) {
    const inserted = insertReminderModule(sections);
    sections = inserted.sections;
    reminderModuleId = inserted.module.id;
    createdReminderModule = true;
    reminderModules = [inserted.module];
  } else {
    reminderModuleId = reminderModules[0].id;
  }

  const targetModule = reminderModules[0];
  const existing = parseReminderRecordsFromModule(targetModule);
  const baseline = existing.length > 0 ? existing : [createDefaultReminderRecord()];
  const { records, importedCount, skippedCount } = mergeReminderRecords(baseline, incoming);

  return {
    layoutSections: updateReminderModule(sections, reminderModuleId, records),
    reminderModuleId,
    createdReminderModule,
    importedCount,
    skippedCount,
    totalBuilderRecords: records.length
  };
}

export function countReminderRecordsInLayout(layoutSections: BuilderTemplateSection[]): number {
  return collectReminderModulesFromLayout(layoutSections).reduce(
    (total, module) => total + parseReminderRecordsFromModule(module).length,
    0
  );
}

export function applyImportedLayoutToPage(
  page: BuilderPageRecord,
  layoutSections: BuilderTemplateSection[]
): BuilderPageRecord {
  return {
    ...page,
    layoutSections
  };
}
