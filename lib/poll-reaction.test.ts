import { describe, expect, it } from "vitest";
import {
  isPollReactionKind,
  scoreNameForPollReaction
} from "@/lib/poll-reaction";
import {
  POLL_DISLIKE_SCORE_NAME,
  POLL_LIKE_SCORE_NAME
} from "@/lib/game-scoring-points";

describe("poll reaction helpers", () => {
  it("accepts like and dislike reaction kinds", () => {
    expect(isPollReactionKind("like")).toBe(true);
    expect(isPollReactionKind("dislike")).toBe(true);
    expect(isPollReactionKind("skip")).toBe(false);
  });

  it("maps reaction kinds to scoring rule names", () => {
    expect(scoreNameForPollReaction("like")).toBe(POLL_LIKE_SCORE_NAME);
    expect(scoreNameForPollReaction("dislike")).toBe(POLL_DISLIKE_SCORE_NAME);
  });
});
