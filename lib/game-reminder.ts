export type GameReminderDisplayType = "popup" | "inline";
export type GameReminderCriterionType = "polls_taken" | "logins" | "specific_poll" | "registered";
export type GameReminderOperator = "gte" | "eq" | "lte";
export type GameReminderCriteriaLogic = "and" | "or";

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

export type GameReminderCriterion = {
  id: string;
  type: GameReminderCriterionType;
  value: GameReminderCriterionValue;
};

export type GameReminderCriteriaConfig = {
  logic: GameReminderCriteriaLogic;
  criteria: GameReminderCriterion[];
};

export type GameReminder = {
  id: string;
  name: string;
  displayType: GameReminderDisplayType;
  messageHtml: string;
  criteriaLogic: GameReminderCriteriaLogic;
  criteria: GameReminderCriterion[];
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
export const GAME_REMINDER_CRITERIA_LOGIC_OPTIONS: GameReminderCriteriaLogic[] = ["and", "or"];

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

function normalizeCriteriaLogic(value: unknown): GameReminderCriteriaLogic {
  const logic = String(value ?? "").trim();
  return GAME_REMINDER_CRITERIA_LOGIC_OPTIONS.includes(logic as GameReminderCriteriaLogic)
    ? (logic as GameReminderCriteriaLogic)
    : "and";
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

function createDefaultReminderCriterion(
  type: GameReminderCriterionType = "polls_taken"
): GameReminderCriterion {
  if (type === "specific_poll") {
    return { id: crypto.randomUUID(), type, value: { pollId: "" } };
  }

  if (type === "registered") {
    return { id: crypto.randomUUID(), type, value: { registered: false } };
  }

  return { id: crypto.randomUUID(), type, value: { operator: "gte", count: 1 } };
}

function normalizeReminderCriterion(value: unknown): GameReminderCriterion | null {
  const record = toRecord(value);
  const type = normalizeCriterionType(record.type ?? record.criterionType);
  const id = String(record.id ?? "").trim() || crypto.randomUUID();

  return {
    id,
    type,
    value: normalizeCriterionValue(type, record.value ?? record.criterionValue)
  };
}

function parseCriteriaConfigFromMetadata(
  metadata: unknown,
  fallbackType: GameReminderCriterionType,
  fallbackValue: unknown
): GameReminderCriteriaConfig {
  const metadataRecord = toRecord(metadata);
  const configRecord = toRecord(metadataRecord.criteriaConfig);
  const rawCriteria = Array.isArray(configRecord.criteria) ? configRecord.criteria : [];
  const parsedCriteria = rawCriteria
    .map((entry) => normalizeReminderCriterion(entry))
    .filter((entry): entry is GameReminderCriterion => entry !== null);

  if (parsedCriteria.length > 0) {
    return {
      logic: normalizeCriteriaLogic(configRecord.logic),
      criteria: parsedCriteria
    };
  }

  return {
    logic: "and",
    criteria: [
      {
        id: crypto.randomUUID(),
        type: fallbackType,
        value: normalizeCriterionValue(fallbackType, fallbackValue)
      }
    ]
  };
}

export function buildReminderCriteriaMetadata(config: GameReminderCriteriaConfig): Record<string, unknown> {
  return {
    criteriaConfig: {
      logic: config.logic,
      criteria: config.criteria.map((criterion) => ({
        id: criterion.id,
        type: criterion.type,
        value: criterion.value
      }))
    }
  };
}

export function parseReminderCriteriaInput(input: {
  criteriaLogic?: unknown;
  criteria?: unknown;
  criterionType?: unknown;
  criterionValue?: unknown;
}): { config: GameReminderCriteriaConfig; error: string | null } {
  const rawCriteria = Array.isArray(input.criteria) ? input.criteria : [];

  if (rawCriteria.length > 0) {
    const criteria = rawCriteria
      .map((entry) => normalizeReminderCriterion(entry))
      .filter((entry): entry is GameReminderCriterion => entry !== null);

    if (criteria.length === 0) {
      return { config: { logic: "and", criteria: [createDefaultReminderCriterion()] }, error: "Add at least one valid criterion." };
    }

    for (const criterion of criteria) {
      if (criterion.type === "specific_poll" && !asPollCriterionValue(criterion.value).pollId) {
        return { config: { logic: "and", criteria }, error: "Select a poll for each specific-poll criterion." };
      }
    }

    return {
      config: {
        logic: normalizeCriteriaLogic(input.criteriaLogic),
        criteria
      },
      error: null
    };
  }

  const criterionType = normalizeCriterionType(input.criterionType);
  const criterionValue = normalizeCriterionValue(criterionType, input.criterionValue);

  if (criterionType === "specific_poll" && !asPollCriterionValue(criterionValue).pollId) {
    return {
      config: { logic: "and", criteria: [createDefaultReminderCriterion("specific_poll")] },
      error: "Select a poll for this reminder."
    };
  }

  return {
    config: {
      logic: normalizeCriteriaLogic(input.criteriaLogic),
      criteria: [{ id: crypto.randomUUID(), type: criterionType, value: criterionValue }]
    },
    error: null
  };
}

function asPollCriterionValue(value: GameReminderCriterionValue): GameReminderPollCriterion {
  if ("pollId" in value) {
    return value;
  }

  return { pollId: "" };
}

export { createDefaultReminderCriterion };

export function gameReminderToClient(row: GameReminderRow): GameReminder {
  const criterionType = normalizeCriterionType(row.criterion_type);
  const criteriaConfig = parseCriteriaConfigFromMetadata(row.metadata, criterionType, row.criterion_value);
  const primaryCriterion = criteriaConfig.criteria[0] ?? createDefaultReminderCriterion(criterionType);

  return {
    id: row.id,
    name: row.name,
    displayType: normalizeDisplayType(row.display_type),
    messageHtml: row.message_html ?? "",
    criteriaLogic: criteriaConfig.logic,
    criteria: criteriaConfig.criteria,
    criterionType: primaryCriterion.type,
    criterionValue: primaryCriterion.value,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function buildReminderSaveFields(input: {
  criteriaLogic?: unknown;
  criteria?: unknown;
  criterionType?: unknown;
  criterionValue?: unknown;
  existingMetadata?: unknown;
}): { config: GameReminderCriteriaConfig; criterionType: GameReminderCriterionType; criterionValue: GameReminderCriterionValue; metadata: Record<string, unknown>; error: string | null } {
  const { config, error } = parseReminderCriteriaInput(input);
  const primaryCriterion = config.criteria[0] ?? createDefaultReminderCriterion();
  const existingMetadata = toRecord(input.existingMetadata);

  return {
    config,
    criterionType: primaryCriterion.type,
    criterionValue: primaryCriterion.value,
    metadata: {
      ...existingMetadata,
      ...buildReminderCriteriaMetadata(config)
    },
    error
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

export function reminderCriteriaLogicLabel(logic: GameReminderCriteriaLogic): string {
  return logic === "or" ? "Any Match (OR)" : "All Match (AND)";
}

export function formatReminderCriterionSummary(
  criterion: Pick<GameReminderCriterion, "type" | "value">,
  pollLabelById: Record<string, string> = {}
): string {
  if (criterion.type === "specific_poll") {
    const pollId = "pollId" in criterion.value ? criterion.value.pollId : "";
    const pollLabel = pollLabelById[pollId] || pollId || "Unknown poll";
    return `Specific poll: ${pollLabel}`;
  }

  if (criterion.type === "registered") {
    const registered = "registered" in criterion.value ? criterion.value.registered : false;
    return registered ? "Registered: Yes" : "Registered: No";
  }

  const numeric = criterion.value as GameReminderNumericCriterion;
  const subject = criterion.type === "logins" ? "Logins" : "Polls taken";
  return `${subject}: ${reminderOperatorLabel(numeric.operator).toLowerCase()} ${numeric.count}`;
}

export function formatReminderCriteriaSummary(
  reminder: Pick<GameReminder, "criteriaLogic" | "criteria">,
  pollLabelById: Record<string, string> = {}
): string {
  if (!reminder.criteria.length) {
    return "No criteria";
  }

  const joiner = reminder.criteriaLogic === "or" ? " OR " : " AND ";
  return reminder.criteria
    .map((criterion) => formatReminderCriterionSummary(criterion, pollLabelById))
    .join(joiner);
}
