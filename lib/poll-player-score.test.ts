import { describe, expect, it } from "vitest";
import {
  countCountableProgressPolls,
  filterReactionsToCountablePolls,
  filterResponsesToCountablePolls,
  sumCountableReactionPoints,
  sumCountableResponsePoints
} from "@/lib/poll-player-score";

const countablePollIds = new Set(["poll-a", "poll-b"]);

describe("poll-player-score", () => {
  it("ignores responses tied to deleted or inactive polls", () => {
    const responses = filterResponsesToCountablePolls(
      [
        { poll_id: "poll-a", tokens_earned: 2, is_skipped: false },
        { poll_id: "poll-deleted", tokens_earned: 5, is_skipped: false },
        { poll_id: "poll-b", tokens_earned: 1, is_skipped: true }
      ],
      countablePollIds
    );

    expect(responses).toHaveLength(2);
    expect(sumCountableResponsePoints(responses)).toBe(3);
    expect(countCountableProgressPolls(responses)).toBe(1);
  });

  it("ignores reactions tied to deleted or inactive polls", () => {
    const reactions = filterReactionsToCountablePolls(
      [
        { poll_id: "poll-a", tokens_earned: 2 },
        { poll_id: "poll-deleted", tokens_earned: 4 }
      ],
      countablePollIds
    );

    expect(reactions).toHaveLength(1);
    expect(sumCountableReactionPoints(reactions)).toBe(2);
  });
});
