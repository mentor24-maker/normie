import { describe, expect, it } from "vitest";
import {
  getPlayerPortalAuthModeFromLocation,
  PLAYER_PORTAL_REGISTER_HREF
} from "@/lib/player-portal-auth-url";

describe("getPlayerPortalAuthModeFromLocation", () => {
  it("reads register mode from query string", () => {
    expect(getPlayerPortalAuthModeFromLocation("?mode=register", "")).toBe("register");
  });

  it("reads register mode from hash aliases", () => {
    expect(getPlayerPortalAuthModeFromLocation("", "#register")).toBe("register");
    expect(getPlayerPortalAuthModeFromLocation("", "#player-portal-auth")).toBe("register");
  });

  it("builds the canonical register href", () => {
    expect(PLAYER_PORTAL_REGISTER_HREF).toBe("/portal?mode=register#player-portal-auth");
  });
});
