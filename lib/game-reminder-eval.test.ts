import { describe, expect, it } from "vitest";
import { evaluatePlayerReminders, explainReminderMatch, reminderMatchesContext, type PlayerReminderContext } from "@/lib/game-reminder-eval";
import type { GameReminder } from "@/lib/game-reminder";

function buildReminder(overrides: Partial<GameReminder> = {}): GameReminder {
  return {
    id: "reminder-1",
    name: "Test reminder",
    displayType: "popup",
    messageHtml: "<p>Hello</p>",
    criterionType: "polls_taken",
    criterionValue: { operator: "gte", count: 5 },
    isActive: true,
    sortOrder: 0,
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

const baseContext: PlayerReminderContext = {
  pollsTaken: 5,
  loginCount: 2,
  answeredPollIds: new Set(["poll-a"]),
  isRegistered: true
};

describe("reminderMatchesContext", () => {
  it("matches polls taken with gte", () => {
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "polls_taken", criterionValue: { operator: "gte", count: 5 } }),
        baseContext
      )
    ).toBe(true);
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "polls_taken", criterionValue: { operator: "gte", count: 6 } }),
        baseContext
      )
    ).toBe(false);
  });

  it("matches polls taken with eq", () => {
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "polls_taken", criterionValue: { operator: "eq", count: 5 } }),
        baseContext
      )
    ).toBe(true);
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "polls_taken", criterionValue: { operator: "eq", count: 4 } }),
        baseContext
      )
    ).toBe(false);
  });

  it("matches logins", () => {
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "logins", criterionValue: { operator: "eq", count: 2 } }),
        baseContext
      )
    ).toBe(true);
  });

  it("matches specific poll", () => {
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "specific_poll", criterionValue: { pollId: "poll-a" } }),
        baseContext
      )
    ).toBe(true);
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "specific_poll", criterionValue: { pollId: "poll-b" } }),
        baseContext
      )
    ).toBe(false);
  });

  it("matches registered status", () => {
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "registered", criterionValue: { registered: true } }),
        baseContext
      )
    ).toBe(true);
    expect(
      reminderMatchesContext(
        buildReminder({ criterionType: "registered", criterionValue: { registered: false } }),
        { ...baseContext, isRegistered: false }
      )
    ).toBe(true);
  });
});

describe("evaluatePlayerReminders", () => {
  it("returns matched reminders sorted by sort order", () => {
    const reminders = [
      buildReminder({ id: "b", name: "Second", sortOrder: 2 }),
      buildReminder({ id: "a", name: "First", sortOrder: 1, criterionValue: { operator: "eq", count: 5 } })
    ];

    const matched = evaluatePlayerReminders(reminders, baseContext);

    expect(matched.map((reminder) => reminder.id)).toEqual(["a", "b"]);
  });
});

describe("explainReminderMatch", () => {
  it("explains an exact polls-taken miss", () => {
    const explanation = explainReminderMatch(
      buildReminder({ criterionType: "polls_taken", criterionValue: { operator: "eq", count: 5 } }),
      { ...baseContext, pollsTaken: 6 }
    );

    expect(explanation.matched).toBe(false);
    expect(explanation.reason).toContain("Polls taken is 6");
    expect(explanation.reason).toContain("exactly 5");
  });
});
