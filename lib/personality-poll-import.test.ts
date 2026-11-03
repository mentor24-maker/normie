import { describe, expect, it } from "vitest";
import {
  isPersonalityTypeBCsv,
  mapPersonalityTypeAPollRow,
  mapPersonalityTypeBPollRow,
  resolvePersonalityImportKind
} from "@/lib/personality-poll-import";

describe("resolvePersonalityImportKind", () => {
  it("detects type A from Category B headers", () => {
    const fields = [
      "category_b",
      "option_1",
      "option_b",
      "question",
      "personality_system",
      "trait_dimension"
    ];
    expect(resolvePersonalityImportKind("", fields)).toBe("a");
  });

  it("detects type B from Personality System B headers", () => {
    const fields = [
      "question",
      "personality_system_b",
      "primary_trait",
      "option_a_maps_to",
      "option_b_maps_to",
      "scoring_logic",
      "ai_interpretation_tag"
    ];
    expect(resolvePersonalityImportKind("", fields)).toBe("b");
  });
});

describe("isPersonalityTypeBCsv", () => {
  it("matches the production Type B export", () => {
    expect(
      isPersonalityTypeBCsv([
        "question",
        "personality_system_b",
        "primary_trait",
        "option_a_maps_to",
        "option_b_maps_to",
        "scoring_logic",
        "ai_interpretation_tag"
      ])
    ).toBe(true);
  });
});

describe("mapPersonalityTypeBPollRow", () => {
  it("maps the Type B export columns", () => {
    const row = {
      question: "Would you rather X or Y?",
      personality_system_b: "MBTI",
      primary_trait: "E vs I",
      option_a_maps_to: "E",
      option_b_maps_to: "I",
      scoring_logic: "logic",
      ai_interpretation_tag: "tag"
    };

    const mapped = mapPersonalityTypeBPollRow(row);
    expect(mapped?.question).toBe("Would you rather X or Y?");
    expect(mapped?.category).toBe("MBTI");
    expect(mapped?.options).toEqual(["E", "I"]);
    expect(mapped?.optionAScoreCode).toBe("E");
    expect(mapped?.scoringWeight).toBe(1);
    expect(mapped?.reverseScored).toBe(false);
  });
});

describe("mapPersonalityTypeAPollRow", () => {
  it("maps Category B and Option 1", () => {
    const row = {
      category_b: "Identity",
      question: "Pick one",
      option_1: "A",
      option_b: "B",
      personality_system: "SYS",
      trait_dimension: "T",
      option_a_score_code: "1",
      option_b_score_code: "2",
      scoring_logic: "logic",
      weight: "2",
      reverse_scored: "Yes",
      ai_interpretation_tag: "tag"
    };

    const mapped = mapPersonalityTypeAPollRow(row);
    expect(mapped?.category).toBe("Identity");
    expect(mapped?.sourceQuestionId).toBe("");
    expect(mapped?.reverseScored).toBe(true);
  });
});
