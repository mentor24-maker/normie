import { describe, expect, it } from "vitest";
import {
  builderReminderRecordFromGameReminder,
  countReminderRecordsInLayout,
  importLegacyGameRemindersIntoPageLayout
} from "@/lib/import-legacy-game-reminders";
import type { GameReminder } from "@/lib/game-reminder";
import { parseReminderRecordsFromModule, REMINDER_RECORDS_JSON_SETTING_KEY } from "@/lib/builder-reminder-module";
import { createEmptySection } from "@/lib/builder-template";

function sampleLegacyReminder(overrides: Partial<GameReminder> = {}): GameReminder {
  return {
    id: "legacy-1",
    name: "Signup Nudge",
    displayType: "popup",
    appearance: "speech_bubble",
    messageHtml: "<p>Register now</p>",
    criteriaLogic: "and",
    criteria: [
      { id: "c1", type: "polls_taken", value: { operator: "gte", count: 2 } },
      { id: "c2", type: "registered", value: { registered: false } }
    ],
    criterionType: "polls_taken",
    criterionValue: { operator: "gte", count: 2 },
    audience: "public",
    isActive: true,
    sortOrder: 1,
    metadata: {
      backgroundColor: "#ffffff",
      borderColor: "#4cbb17"
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("importLegacyGameRemindersIntoPageLayout", () => {
  it("creates a reminder module when the page has none", () => {
    const result = importLegacyGameRemindersIntoPageLayout([createEmptySection("single")], [
      sampleLegacyReminder()
    ]);

    expect(result.createdReminderModule).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(countReminderRecordsInLayout(result.layoutSections)).toBeGreaterThanOrEqual(2);
  });

  it("skips records that already exist in reminderRecordsJson", () => {
    const legacy = sampleLegacyReminder({ id: "dup-id" });
    const record = builderReminderRecordFromGameReminder(legacy);
    const sections = [
      {
        ...createEmptySection("single"),
        modules: [
          {
            id: "reminder-mod",
            name: "Reminders",
            text: "",
            type: "reminder" as const,
            column: "main",
            settings: {
              [REMINDER_RECORDS_JSON_SETTING_KEY]: JSON.stringify([record])
            }
          }
        ]
      }
    ];

    const result = importLegacyGameRemindersIntoPageLayout(sections, [legacy, sampleLegacyReminder({ id: "legacy-2", name: "Other" })]);

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(countReminderRecordsInLayout(result.layoutSections)).toBe(2);
  });

  it("stores imported records on the reminder module", () => {
    const result = importLegacyGameRemindersIntoPageLayout([], [sampleLegacyReminder({ id: "x1" })]);
    const module = result.layoutSections[0]?.modules.find((entry) => entry.type === "reminder");

    expect(module).toBeTruthy();
    const records = module ? parseReminderRecordsFromModule(module) : [];
    expect(records.some((record) => record.id === "x1")).toBe(true);
  });
});
