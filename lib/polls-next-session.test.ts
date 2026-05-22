import { describe, expect, it } from "vitest";
import {
  resolveCurrentPollIndexFromSession,
  resolveFirstUnansweredPollIndex
} from "@/lib/polls-next-session";

function ids(...labels: string[]) {
  return labels.map((id) => ({ id }));
}

describe("resolveFirstUnansweredPollIndex", () => {
  it("returns first unanswered poll even when later polls were answered", () => {
    const ordered = ids("p0", "p1", "p2", "p3", "p4");
    expect(resolveFirstUnansweredPollIndex(ordered, new Set(["p2", "p4"]))).toBe(0);
  });

  it("returns -1 when every poll is answered", () => {
    const ordered = ids("a", "b");
    expect(resolveFirstUnansweredPollIndex(ordered, new Set(["a", "b"]))).toBe(-1);
  });
});

describe("resolveCurrentPollIndexFromSession", () => {
  it("returns -1 for empty list", () => {
    expect(resolveCurrentPollIndexFromSession([], new Set())).toBe(-1);
  });

  it("returns first poll when nothing answered", () => {
    const ordered = ids("a", "b", "c");
    expect(resolveCurrentPollIndexFromSession(ordered, new Set())).toBe(0);
  });

  it("returns next poll after consecutive answers from the start", () => {
    const ordered = ids("a", "b", "c", "d");
    expect(resolveCurrentPollIndexFromSession(ordered, new Set(["a"]))).toBe(1);
    expect(resolveCurrentPollIndexFromSession(ordered, new Set(["a", "b"]))).toBe(2);
    expect(resolveCurrentPollIndexFromSession(ordered, new Set(["a", "b", "c"]))).toBe(3);
  });

  it("advances after the furthest answered index (deep-link / viewer case)", () => {
    const ordered = ids("p0", "p1", "p2", "p3", "p4");
    const answered = new Set(["p2"]);
    expect(resolveCurrentPollIndexFromSession(ordered, answered)).toBe(3);
  });

  it("returns -1 when every poll is answered", () => {
    const ordered = ids("a", "b");
    expect(resolveCurrentPollIndexFromSession(ordered, new Set(["a", "b"]))).toBe(-1);
  });
});
