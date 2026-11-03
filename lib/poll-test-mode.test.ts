import { describe, expect, it } from "vitest";
import {
  excludePinnedPollFromAnswered,
  isLocalhostPollTestHost,
  nextPollTestProgress
} from "./poll-test-mode";
import { resolvePollAnswerProgress, shouldFirePollAnswerEffects } from "./poll-answer-client";

describe("isLocalhostPollTestHost", () => {
  it("matches only localhost:3000", () => {
    expect(isLocalhostPollTestHost("localhost:3000")).toBe(true);
    expect(isLocalhostPollTestHost("LOCALHOST:3000")).toBe(true);
    expect(isLocalhostPollTestHost("localhost:3001")).toBe(false);
    expect(isLocalhostPollTestHost("www.normie.one")).toBe(false);
  });
});

describe("nextPollTestProgress", () => {
  it("increments from stored progress or db fallback", () => {
    expect(nextPollTestProgress(2, 5)).toBe(3);
    expect(nextPollTestProgress(null, 5)).toBe(6);
  });
});

describe("shouldFirePollAnswerEffects", () => {
  it("fires on every test-mode answer", () => {
    expect(shouldFirePollAnswerEffects({ pollTestMode: true, duplicate: true })).toBe(true);
    expect(shouldFirePollAnswerEffects({ testerPollMode: true, duplicate: true })).toBe(true);
    expect(shouldFirePollAnswerEffects({ duplicate: true })).toBe(false);
  });
});

describe("resolvePollAnswerProgress", () => {
  it("accepts either progress field", () => {
    expect(resolvePollAnswerProgress({ progressPollsTaken: 4 })).toBe(4);
    expect(resolvePollAnswerProgress({ playerAnswerCount: 20 })).toBe(20);
  });
});

describe("excludePinnedPollFromAnswered", () => {
  it("removes the pinned poll from the answered set", () => {
    const answered = new Set(["a", "b"]);
    excludePinnedPollFromAnswered(answered, "a");
    expect(answered.has("a")).toBe(false);
    expect(answered.has("b")).toBe(true);
  });
});
