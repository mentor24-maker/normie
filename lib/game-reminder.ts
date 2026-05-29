export type GameReminderDisplayType = "popup" | "inline";
export type GameReminderCriterionType = "polls_taken" | "logins" | "specific_poll" | "registered";
export type GameReminderOperator = "gte" | "eq" | "lte";

export type GameReminderNumericCriterion = {
  operator: GameReminderOperator;
  count: number;
};

export type GameReminderPollCriterion = {
  pollId: string;
};

export type GameReminderRegisteredCriterion = {
  registered: boolean;
};

export type GameReminderCriterionValue =
  | GameReminderNumericCriterion
  | GameReminderPollCriterion
  | GameReminderRegisteredCriterion;

export type GameReminder = {
  id: string;
  name: string;
  displayType: GameReminderDisplayType;
  messageHtml: string;
  criterionType: GameReminderCriterionType;
  criterionValue: GameReminderCriterionValue;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export const GAME_REMINDER_DISPLAY_TYPES: GameReminderDisplayType[] = ["popup", "inline"];
export const GAME_REMINDER_CRITERION_TYPES: GameReminderCriterionType[] = [
  "polls_taken",
  "logins",
  "specific_poll",
  "registered"
];
export const GAME_REMINDER_OPERATORS: GameReminderOperator[] = ["gte", "eq", "lte"];

type GameReminderRow = {
  id: string;
  name: string;
  display_type: string | null;
  message_html: string | null;
  criterion_type: string | null;
  criterion_value: unknown;
  is_active: boolean | null;
  sort_order: number | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeDisplayType(value: unknown): GameReminderDisplayType {
  const displayType = String(value ?? "").trim();
  return GAME_REMINDER_DISPLAY_TYPES.includes(displayType as GameReminderDisplayType)
    ? (displayType as GameReminderDisplayType)
    : "popup";
}

function normalizeCriterionType(value: unknown): GameReminderCriterionType {
  const criterionType = String(value ?? "").trim();
  return GAME_REMINDER_CRITERION_TYPES.includes(criterionType as GameReminderCriterionType)
    ? (criterionType as GameReminderCriterionType)
    : "polls_taken";
}

function normalizeOperator(value: unknown): GameReminderOperator {
  const operator = String(value ?? "").trim();
  return GAME_REMINDER_OPERATORS.includes(operator as GameReminderOperator)
    ? (operator as GameReminderOperator)
    : "gte";
}

function normalizeCriterionValue(
  criterionType: GameReminderCriterionType,
  value: unknown
): GameReminderCriterionValue {
  const record = toRecord(value);

  if (criterionType === "specific_poll") {
    return { pollId: String(record.pollId ?? "").trim() };
  }

  if (criterionType === "registered") {
    return { registered: record.registered === true };
  }

  const count = Number.parseInt(String(record.count ?? 1), 10);
  return {
    operator: normalizeOperator(record.operator),
    count: Number.isFinite(count) ? Math.max(0, count) : 1
  };
}

export function gameReminderToClient(row: GameReminderRow): GameReminder {
  const criterionType = normalizeCriterionType(row.criterion_type);

  return {
    id: row.id,
    name: row.name,
    displayType: normalizeDisplayType(row.display_type),
    messageHtml: row.message_html ?? "",
    criterionType,
    criterionValue: normalizeCriterionValue(criterionType, row.criterion_value),
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function parseReminderCriterionValueInput(
  criterionType: GameReminderCriterionType,
  value: unknown
): GameReminderCriterionValue {
  return normalizeCriterionValue(criterionType, value);
}

export function reminderOperatorLabel(operator: GameReminderOperator): string {
  if (operator === "eq") {
    return "Exactly";
  }

  if (operator === "lte") {
    return "At Most";
  }

  return "At Least";
}

export function reminderCriterionTypeLabel(criterionType: GameReminderCriterionType): string {
  if (criterionType === "polls_taken") {
    return "Polls Taken";
  }

  if (criterionType === "logins") {
    return "Logins";
  }

  if (criterionType === "specific_poll") {
    return "Specific Poll";
  }

  return "Registered";
}

export function reminderDisplayTypeLabel(displayType: GameReminderDisplayType): string {
  return displayType === "inline" ? "Inline" : "Popup";
}

export function formatReminderCriterionSummary(
  reminder: Pick<GameReminder, "criterionType" | "criterionValue">,
  pollLabelById: Record<string, string> = {}
): string {
  if (reminder.criterionType === "specific_poll") {
    const pollId = "pollId" in reminder.criterionValue ? reminder.criterionValue.pollId : "";
    const pollLabel = pollLabelById[pollId] || pollId || "Unknown poll";
    return `Specific poll: ${pollLabel}`;
  }

  if (reminder.criterionType === "registered") {
    const registered = "registered" in reminder.criterionValue ? reminder.criterionValue.registered : false;
    return registered ? "Registered: Yes" : "Registered: No";
  }

  const numeric = reminder.criterionValue as GameReminderNumericCriterion;
  const subject = reminder.criterionType === "logins" ? "Logins" : "Polls taken";
  return `${subject}: ${reminderOperatorLabel(numeric.operator).toLowerCase()} ${numeric.count}`;
}
