import { describe, expect, it } from "vitest";
import { countProgressPolls, sumPointsEarned } from "@/lib/player-poll-stats";

describe("player poll stats", () => {
  it("excludes skipped responses from progress poll count", () => {
    expect(
      countProgressPolls([
        { is_skipped: false, tokens_earned: 1 },
        { is_skipped: true, tokens_earned: 1 },
        { tokens_earned: 1 }
      ])
    ).toBe(2);
  });

  it("sums tokens from skipped and answered polls", () => {
    expect(
      sumPointsEarned([
        { tokens_earned: 1 },
        { tokens_earned: 1, is_skipped: true }
      ])
    ).toBe(2);
  });
});
