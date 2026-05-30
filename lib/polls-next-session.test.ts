import { describe, expect, it } from "vitest";
import { pickRandomUnansweredPoll, resolveMostRecentAnsweredPoll, shuffleForDisplay } from "@/lib/polls-next-session";

function ids(...labels: string[]) {
  return labels.map((id) => ({ id }));
}

describe("pickRandomUnansweredPoll", () => {
  it("returns null when every poll is answered", () => {
    const ordered = ids("a", "b");
    expect(pickRandomUnansweredPoll(ordered, new Set(["a", "b"]))).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(pickRandomUnansweredPoll([], new Set())).toBeNull();
  });

  it("only selects from unanswered polls", () => {
    const ordered = ids("a", "b", "c", "d");
    const answered = new Set(["a", "c"]);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const picked = pickRandomUnansweredPoll(ordered, answered);
      expect(picked).not.toBeNull();
      expect(["b", "d"]).toContain(picked?.id);
    }
  });
});

describe("shuffleForDisplay", () => {
  it("returns a permutation of the input", () => {
    const source = ["a", "b", "c", "d"];
    const shuffled = shuffleForDisplay(source);

    expect(shuffled).toHaveLength(source.length);
    expect(shuffled.sort()).toEqual(source.sort());
    expect(shuffled).not.toBe(source);
  });

  it("can change order for multi-item lists", () => {
    const source = ["a", "b", "c", "d", "e", "f"];

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const shuffled = shuffleForDisplay(source);
      if (shuffled.some((value, index) => value !== source[index])) {
        return;
      }
    }

    throw new Error("Expected shuffleForDisplay to change order at least once.");
  });
});

describe("resolveMostRecentAnsweredPoll", () => {
  it("returns the first matching response in newest-first order", () => {
    const ordered = ids("a", "b", "c");
    const responses = [{ poll_id: "c" }, { poll_id: "a" }];

    expect(resolveMostRecentAnsweredPoll(ordered, responses)?.id).toBe("c");
  });

  it("skips excluded poll id", () => {
    const ordered = ids("a", "b", "c");
    const responses = [{ poll_id: "c" }, { poll_id: "a" }];

    expect(resolveMostRecentAnsweredPoll(ordered, responses, "c")?.id).toBe("a");
  });

  it("returns null when there are no responses", () => {
    expect(resolveMostRecentAnsweredPoll(ids("a", "b"), [])).toBeNull();
  });
});
