import { describe, expect, it } from "vitest";
import {
  createDefaultSurveyConfig,
  normalizeSurveyConfig,
  validateSurveyAnswers
} from "@/lib/game-interstitial-survey";

describe("game-interstitial-survey", () => {
  it("normalizes survey config with defaults", () => {
    const config = normalizeSurveyConfig({});

    expect(config.headerLabel).toBe("Quick Survey");
    expect(config.showEveryPolls).toBe(3);
    expect(config.questions.length).toBeGreaterThan(0);
    expect(config.questions[0]?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("validates complete survey answers", () => {
    const config = createDefaultSurveyConfig();
    const question = config.questions[0]!;
    const answers = {
      [question.id]: question.options[0]!.id
    };

    const result = validateSurveyAnswers(config.questions, answers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers[question.id]).toBe(question.options[0]!.id);
    }
  });

  it("rejects missing survey answers", () => {
    const config = createDefaultSurveyConfig();
    const result = validateSurveyAnswers(config.questions, {});

    expect(result.ok).toBe(false);
  });
});
