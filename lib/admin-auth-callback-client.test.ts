import { describe, expect, it } from "vitest";
import { isInviteLikeCallback } from "@/lib/admin-auth-callback-client";

describe("isInviteLikeCallback", () => {
  it("treats invite and recovery as invite-like flows", () => {
    expect(isInviteLikeCallback("invite")).toBe(true);
    expect(isInviteLikeCallback("recovery")).toBe(true);
    expect(isInviteLikeCallback("signup")).toBe(true);
  });

  it("does not treat oauth-only callbacks as invite-like", () => {
    expect(isInviteLikeCallback("magiclink")).toBe(false);
    expect(isInviteLikeCallback(null)).toBe(false);
  });
});
