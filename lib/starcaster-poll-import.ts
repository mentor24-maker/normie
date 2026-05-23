export const STARCASTER_IMPORT_TYPE = "starcaster";

export const STARCASTER_CSV_HELP_COLUMNS =
  "Category B,Personality System,Trait / Dimension,Option 1,Option B,Question,Option A Score Code,Option B Score Code,Scoring Logic,Weight,Reverse Scored?,AI Interpretation Tag";

/** Normalized Papa headers for the Normie 200 Starcaster CSV (exact mapping only). */
export const STARCASTER_CSV_FIELDS = {
  category: "category_b",
  personalitySystem: "personality_system",
  traitDimension: "trait_dimension",
  option1: "option_1",
  optionB: "option_b",
  question: "question",
  optionAScoreCode: "option_a_score_code",
  optionBScoreCode: "option_b_score_code",
  scoringLogic: "scoring_logic",
  weight: "weight",
  reverseScored: "reverse_scored",
  aiInterpretationTag: "ai_interpretation_tag"
} as const;

export type StarcasterPollRow = {
  category: string;
  question: string;
  options: [string, string];
  personalitySystem: string;
  traitDimension: string;
  optionAScoreCode: string;
  optionBScoreCode: string;
  scoringLogic: string;
  scoringWeight: number;
  reverseScored: boolean;
  aiInterpretationTag: string;
};

export function isStarcasterPollCsv(fields: string[]) {
  return (
    fields.includes(STARCASTER_CSV_FIELDS.category) &&
    fields.includes(STARCASTER_CSV_FIELDS.option1) &&
    fields.includes(STARCASTER_CSV_FIELDS.optionB) &&
    fields.includes(STARCASTER_CSV_FIELDS.question)
  );
}

export function mapStarcasterPollRow(row: Record<string, string>): StarcasterPollRow | null {
  const category = (row[STARCASTER_CSV_FIELDS.category] ?? "").trim();
  const question = (row[STARCASTER_CSV_FIELDS.question] ?? "").trim();
  const optionA = (row[STARCASTER_CSV_FIELDS.option1] ?? "").trim();
  const optionB = (row[STARCASTER_CSV_FIELDS.optionB] ?? "").trim();

  if (!category && !question && !optionA && !optionB) {
    return null;
  }

  if (!question || !optionA || !optionB) {
    return null;
  }

  return {
    category: category || "Uncategorized",
    question,
    options: [optionA, optionB],
    personalitySystem: (row[STARCASTER_CSV_FIELDS.personalitySystem] ?? "").trim(),
    traitDimension: (row[STARCASTER_CSV_FIELDS.traitDimension] ?? "").trim(),
    optionAScoreCode: (row[STARCASTER_CSV_FIELDS.optionAScoreCode] ?? "").trim(),
    optionBScoreCode: (row[STARCASTER_CSV_FIELDS.optionBScoreCode] ?? "").trim(),
    scoringLogic: (row[STARCASTER_CSV_FIELDS.scoringLogic] ?? "").trim(),
    scoringWeight: parseStarcasterWeight(row[STARCASTER_CSV_FIELDS.weight] ?? ""),
    reverseScored: parseStarcasterBoolean(row[STARCASTER_CSV_FIELDS.reverseScored] ?? ""),
    aiInterpretationTag: (row[STARCASTER_CSV_FIELDS.aiInterpretationTag] ?? "").trim()
  };
}

export function starcasterRowToPollInsert(row: StarcasterPollRow) {
  return {
    category: row.category,
    question: row.question,
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

export function parseStarcasterBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

export function parseStarcasterWeight(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : 1;
}
