export const POLL_COLLECTION_STANDARD = "Standard";
export const POLL_COLLECTION_PERSONALITY_TYPE_A = "Personality Type A";
export const POLL_COLLECTION_PERSONALITY_TYPE_B = "Personality Type B";

export const POLL_COLLECTIONS = [
  POLL_COLLECTION_STANDARD,
  POLL_COLLECTION_PERSONALITY_TYPE_A,
  POLL_COLLECTION_PERSONALITY_TYPE_B
] as const;

export type PollCollection = (typeof POLL_COLLECTIONS)[number];

export type PollCollectionRow = {
  category?: string | null;
  personality_system?: string | null;
  trait_dimension?: string | null;
  option_a_score_code?: string | null;
  option_b_score_code?: string | null;
  scoring_logic?: string | null;
  ai_interpretation_tag?: string | null;
  source_question_id?: string | null;
};

function hasText(value: string | null | undefined) {
  return Boolean(String(value ?? "").trim());
}

/** Classify existing poll rows for backfill (matches migration 016 logic). */
export function inferPollCollectionFromPollRow(row: PollCollectionRow): PollCollection {
  const personalitySystem = String(row.personality_system ?? "").trim();
  const category = String(row.category ?? "").trim();

  const hasPersonalityMetadata =
    hasText(row.personality_system) ||
    hasText(row.trait_dimension) ||
    hasText(row.option_a_score_code) ||
    hasText(row.option_b_score_code) ||
    hasText(row.scoring_logic) ||
    hasText(row.ai_interpretation_tag) ||
    hasText(row.source_question_id);

  if (!hasPersonalityMetadata) {
    return POLL_COLLECTION_STANDARD;
  }

  if (personalitySystem && category === personalitySystem) {
    return POLL_COLLECTION_PERSONALITY_TYPE_B;
  }

  return POLL_COLLECTION_PERSONALITY_TYPE_A;
}

export function isPollCollection(value: string): value is PollCollection {
  return (POLL_COLLECTIONS as readonly string[]).includes(value);
}
