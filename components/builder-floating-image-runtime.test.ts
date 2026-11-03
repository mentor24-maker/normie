import { describe, expect, it } from "vitest";
import { shouldFloatingImageUseOverlayHost } from "./builder-floating-image-runtime";

describe("shouldFloatingImageUseOverlayHost", () => {
  it("uses the full-screen overlay host only for game and on-load triggers", () => {
    expect(shouldFloatingImageUseOverlayHost("game")).toBe(true);
    expect(shouldFloatingImageUseOverlayHost("on-load")).toBe(true);
    expect(shouldFloatingImageUseOverlayHost("button")).toBe(false);
  });
});
