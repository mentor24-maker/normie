import { describe, expect, it } from "vitest";
import { shouldResetAuthBeforeInvite } from "@/lib/team-invitations";

describe("shouldResetAuthBeforeInvite", () => {
  it("resets when explicitly resending", () => {
    expect(shouldResetAuthBeforeInvite(true, { status: "active" })).toBe(true);
  });

  it("resets orphan auth users without a team profile", () => {
    expect(shouldResetAuthBeforeInvite(false, null)).toBe(true);
  });

  it("resets invited members so invite email can be sent again", () => {
    expect(shouldResetAuthBeforeInvite(false, { status: "invited" })).toBe(true);
  });

  it("does not reset suspended members unless resending", () => {
    expect(shouldResetAuthBeforeInvite(false, { status: "suspended" })).toBe(false);
  });
});
