import { POLL_COLLECTION_PERSONALITY_TYPE_A, type PollCollection } from "@/lib/poll-collections";
import { normalizePollCategoryForStorage } from "@/lib/poll-categories";

export const PERSONALITY_TYPE_A_IMPORT_TYPE = "personality_type_a";
export const PERSONALITY_TYPE_B_IMPORT_TYPE = "personality_type_b";
export const PERSONALITY_TYPE_C_IMPORT_TYPE = "personality_type_c";

/** @deprecated Use PERSONALITY_TYPE_A_IMPORT_TYPE */
export const STARCASTER_IMPORT_TYPE = PERSONALITY_TYPE_A_IMPORT_TYPE;

export type PersonalityFieldMap = {
  category?: string;
  defaultCategory?: string;
  usePersonalitySystemAsCategory?: boolean;
  question: string;
  questionFallback?: string;
  option1: string;
  optionB: string;
  sourceQuestionId?: string;
  personalitySystem: string;
  traitDimension: string;
  optionAScoreCode: string;
  optionBScoreCode: string;
  scoringLogic?: string;
  weight?: string;
  reverseScored?: string;
  aiInterpretationTag?: string;
};

export const PERSONALITY_TYPE_A_COLUMNS = [
  "Category B",
  "Personality System",
  "Trait / Dimension",
  "Option 1",
  "Option B",
  "Question",
  "Option A Score Code",
  "Option B Score Code",
  "Scoring Logic",
  "Weight",
  "Reverse Scored?",
  "AI Interpretation Tag"
] as const;

export const PERSONALITY_TYPE_B_COLUMNS = [
  "Question",
  "Personality System B",
  "Primary Trait",
  "Option A Maps To",
  "Option B Maps To",
  "Scoring Logic",
  "AI Interpretation Tag"
] as const;

export const PERSONALITY_TYPE_C_COLUMNS = [
  "question_id",
  "category",
  "personality_system",
  "trait_dimension",
  "option_a",
  "option_b",
  "one_line_question",
  "weight",
  "reverse_scored"
] as const;

export const PERSONALITY_TYPE_A_FIELDS: PersonalityFieldMap = {
  category: "category_b",
  question: "question",
  option1: "option_1",
  optionB: "option_b",
  personalitySystem: "personality_system",
  traitDimension: "trait_dimension",
  optionAScoreCode: "option_a_score_code",
  optionBScoreCode: "option_b_score_code",
  scoringLogic: "scoring_logic",
  weight: "weight",
  reverseScored: "reverse_scored",
  aiInterpretationTag: "ai_interpretation_tag"
};

export const PERSONALITY_TYPE_B_FIELDS: PersonalityFieldMap = {
  question: "question",
  option1: "option_a_maps_to",
  optionB: "option_b_maps_to",
  personalitySystem: "personality_system_b",
  traitDimension: "primary_trait",
  optionAScoreCode: "option_a_maps_to",
  optionBScoreCode: "option_b_maps_to",
  scoringLogic: "scoring_logic",
  aiInterpretationTag: "ai_interpretation_tag",
  usePersonalitySystemAsCategory: true
};

export const PERSONALITY_TYPE_C_FIELDS: PersonalityFieldMap = {
  category: "category",
  question: "question",
  questionFallback: "one_line_question",
  option1: "option_a",
  optionB: "option_b",
  sourceQuestionId: "question_id",
  personalitySystem: "personality_system",
  traitDimension: "trait_dimension",
  optionAScoreCode: "option_a",
  optionBScoreCode: "option_b",
  weight: "weight",
  reverseScored: "reverse_scored"
};

/** @deprecated Use PERSONALITY_TYPE_A_COLUMNS */
export const STARCASTER_CSV_HELP_COLUMNS = PERSONALITY_TYPE_A_COLUMNS.join(",");

/** @deprecated Use PERSONALITY_TYPE_A_FIELDS */
export const STARCASTER_CSV_FIELDS = PERSONALITY_TYPE_A_FIELDS;

export type PersonalityPollRow = {
  category: string;
  question: string;
  options: [string, string];
  sourceQuestionId: string;
  personalitySystem: string;
  traitDimension: string;
  optionAScoreCode: string;
  optionBScoreCode: string;
  scoringLogic: string;
  scoringWeight: number;
  reverseScored: boolean;
  aiInterpretationTag: string;
};

/** @deprecated Use PersonalityPollRow */
export type StarcasterPollRow = PersonalityPollRow;

function resolveQuestion(row: Record<string, string>, fields: PersonalityFieldMap) {
  const primary = (row[fields.question] ?? "").trim();

  if (primary) {
    return primary;
  }

  if (fields.questionFallback) {
    return (row[fields.questionFallback] ?? "").trim();
  }

  return "";
}

export function isPersonalityTypeACsv(fields: string[]) {
  return (
    fields.includes(PERSONALITY_TYPE_A_FIELDS.category ?? "") &&
    fields.includes(PERSONALITY_TYPE_A_FIELDS.option1) &&
    fields.includes(PERSONALITY_TYPE_A_FIELDS.optionB) &&
    fields.includes(PERSONALITY_TYPE_A_FIELDS.question)
  );
}

export function isPersonalityTypeBCsv(fields: string[]) {
  return (
    fields.includes(PERSONALITY_TYPE_B_FIELDS.question) &&
    fields.includes(PERSONALITY_TYPE_B_FIELDS.personalitySystem) &&
    fields.includes(PERSONALITY_TYPE_B_FIELDS.option1) &&
    fields.includes(PERSONALITY_TYPE_B_FIELDS.optionB)
  );
}

function resolveCategory(
  row: Record<string, string>,
  fields: PersonalityFieldMap,
  personalitySystem: string
) {
  if (fields.category) {
    const explicitCategory = (row[fields.category] ?? "").trim();

    if (explicitCategory) {
      return explicitCategory;
    }
  }

  if (fields.usePersonalitySystemAsCategory && personalitySystem) {
    return personalitySystem;
  }

  return fields.defaultCategory ?? "Uncategorized";
}

function resolveScoreCode(row: Record<string, string>, fieldKey: string, fallback: string) {
  const value = (row[fieldKey] ?? "").trim();
  return value || fallback;
}

export function mapPersonalityPollRow(
  row: Record<string, string>,
  fields: PersonalityFieldMap
): PersonalityPollRow | null {
  const question = resolveQuestion(row, fields);
  const optionA = (row[fields.option1] ?? "").trim();
  const optionB = (row[fields.optionB] ?? "").trim();
  const personalitySystem = (row[fields.personalitySystem] ?? "").trim();

  if (!question && !optionA && !optionB) {
    return null;
  }

  if (!question || !optionA || !optionB) {
    return null;
  }

  const sourceQuestionId = fields.sourceQuestionId
    ? (row[fields.sourceQuestionId] ?? "").trim()
    : "";

  return {
    category: resolveCategory(row, fields, personalitySystem),
    question,
    options: [optionA, optionB],
    sourceQuestionId,
    personalitySystem,
    traitDimension: (row[fields.traitDimension] ?? "").trim(),
    optionAScoreCode: resolveScoreCode(row, fields.optionAScoreCode, optionA),
    optionBScoreCode: resolveScoreCode(row, fields.optionBScoreCode, optionB),
    scoringLogic: fields.scoringLogic ? (row[fields.scoringLogic] ?? "").trim() : "",
    scoringWeight: fields.weight ? parsePersonalityWeight(row[fields.weight] ?? "") : 1,
    reverseScored: fields.reverseScored
      ? parsePersonalityBoolean(row[fields.reverseScored] ?? "")
      : false,
    aiInterpretationTag: fields.aiInterpretationTag ? (row[fields.aiInterpretationTag] ?? "").trim() : ""
  };
}

export function mapPersonalityTypeAPollRow(row: Record<string, string>) {
  return mapPersonalityPollRow(row, PERSONALITY_TYPE_A_FIELDS);
}

export function mapPersonalityTypeBPollRow(row: Record<string, string>) {
  return mapPersonalityPollRow(row, PERSONALITY_TYPE_B_FIELDS);
}

/** @deprecated Use mapPersonalityTypeAPollRow */
export function mapStarcasterPollRow(row: Record<string, string>) {
  return mapPersonalityTypeAPollRow(row);
}

/** @deprecated Use isPersonalityTypeACsv */
export function isStarcasterPollCsv(fields: string[]) {
  return isPersonalityTypeACsv(fields);
}

export function personalityRowToPollInsert(row: PersonalityPollRow, collection: PollCollection) {
  return {
    category: normalizePollCategoryForStorage(row.category) ?? row.category.trim().slice(0, 255),
    question: row.question,
    collection,
    source_question_id: row.sourceQuestionId,
    personality_system: row.personalitySystem,
    trait_dimension: row.traitDimension,
    option_a_score_code: row.optionAScoreCode,
    option_b_score_code: row.optionBScoreCode,
    scoring_logic: row.scoringLogic,
    scoring_weight: row.scoringWeight,
    reverse_scored: row.reverseScored,
    ai_interpretation_tag: row.aiInterpretationTag
  };
}

/** @deprecated Use personalityRowToPollInsert */
export function starcasterRowToPollInsert(row: PersonalityPollRow) {
  return personalityRowToPollInsert(row, POLL_COLLECTION_PERSONALITY_TYPE_A);
}

export function parsePersonalityBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

export function parsePersonalityWeight(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : 1;
}

/** @deprecated */
export const parseStarcasterBoolean = parsePersonalityBoolean;
/** @deprecated */
export const parseStarcasterWeight = parsePersonalityWeight;

export function resolvePersonalityImportKind(
  importType: string,
  fields: string[]
): "a" | "b" | null {
  const normalizedType = importType.trim().toLowerCase();

  if (
    normalizedType === PERSONALITY_TYPE_B_IMPORT_TYPE ||
    normalizedType === "personality_type_b"
  ) {
    return "b";
  }

  if (
    normalizedType === PERSONALITY_TYPE_C_IMPORT_TYPE ||
    normalizedType === "personality_type_c"
  ) {
    return "a";
  }

  if (
    normalizedType === PERSONALITY_TYPE_A_IMPORT_TYPE ||
    normalizedType === STARCASTER_IMPORT_TYPE ||
    normalizedType === "starcaster" ||
    normalizedType === "advanced"
  ) {
    return "a";
  }

  if (isPersonalityTypeBCsv(fields)) {
    return "b";
  }

  if (isPersonalityTypeACsv(fields)) {
    return "a";
  }

  return null;
}
