import { describe, expect, it } from "vitest";
import {
  mergeTesterPollIntoList,
  normalizeIsTester,
  normalizeTesterPollId,
  readPlayerTesterPollSettings,
  resolvePlayerTesterPollPin,
  resolveTesterSimulatedProgressPolls
} from "./player-tester-poll";

describe("normalizeIsTester", () => {
  it("accepts booleans and common string values", () => {
    expect(normalizeIsTester(true)).toBe(true);
    expect(normalizeIsTester(false)).toBe(false);
    expect(normalizeIsTester("true")).toBe(true);
    expect(normalizeIsTester("on")).toBe(true);
    expect(normalizeIsTester("0")).toBe(false);
  });
});

describe("normalizeTesterPollId", () => {
  it("accepts valid uuids only", () => {
    expect(normalizeTesterPollId("not-a-uuid")).toBeNull();
    expect(normalizeTesterPollId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });
});

describe("readPlayerTesterPollSettings", () => {
  it("clears poll id when tester mode is off", () => {
    expect(
      readPlayerTesterPollSettings({
        is_tester: false,
        tester_poll_id: "550e8400-e29b-41d4-a716-446655440000"
      })
    ).toEqual({
      isTester: false,
      testerPollId: null
    });
  });
});

describe("resolvePlayerTesterPollPin", () => {
  it("returns the assigned poll only for active testers", () => {
    expect(
      resolvePlayerTesterPollPin({
        isTester: true,
        testerPollId: "550e8400-e29b-41d4-a716-446655440000"
      })
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(
      resolvePlayerTesterPollPin({
        isTester: false,
        testerPollId: "550e8400-e29b-41d4-a716-446655440000"
      })
    ).toBeNull();
  });
});

describe("resolveTesterSimulatedProgressPolls", () => {
  it("maps assigned poll order_index to simulated progress polls", () => {
    expect(resolveTesterSimulatedProgressPolls(20)).toBe(20);
    expect(resolveTesterSimulatedProgressPolls(0)).toBeNull();
  });
});

describe("mergeTesterPollIntoList", () => {
  it("appends a missing tester poll in order_index order", () => {
    const merged = mergeTesterPollIntoList(
      [
        { id: "a", order_index: 1 },
        { id: "c", order_index: 3 }
      ],
      { id: "b", order_index: 2 }
    );

    expect(merged.map((poll) => poll.id)).toEqual(["a", "b", "c"]);
  });
});
