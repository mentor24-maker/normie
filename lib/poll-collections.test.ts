import { describe, expect, it } from "vitest";
import {
  inferPollCollectionFromPollRow,
  POLL_COLLECTION_PERSONALITY_TYPE_A,
  POLL_COLLECTION_PERSONALITY_TYPE_B,
  POLL_COLLECTION_STANDARD
} from "@/lib/poll-collections";

describe("inferPollCollectionFromPollRow", () => {
  it("classifies standard polls without scoring metadata", () => {
    expect(
      inferPollCollectionFromPollRow({
        category: "Identity",
        question: "Coffee or tea?"
      })
    ).toBe(POLL_COLLECTION_STANDARD);
  });

  it("classifies Personality Type B when category matches personality_system", () => {
    expect(
      inferPollCollectionFromPollRow({
        category: "MBTI",
        personality_system: "MBTI",
        trait_dimension: "E/I",
        option_a_score_code: "E",
        option_b_score_code: "I"
      })
    ).toBe(POLL_COLLECTION_PERSONALITY_TYPE_B);
  });

  it("classifies Personality Type A when category differs from personality_system", () => {
    expect(
      inferPollCollectionFromPollRow({
        category: "Core Personality",
        personality_system: "MBTI",
        trait_dimension: "E/I",
        option_a_score_code: "E",
        option_b_score_code: "I"
      })
    ).toBe(POLL_COLLECTION_PERSONALITY_TYPE_A);
  });
});
