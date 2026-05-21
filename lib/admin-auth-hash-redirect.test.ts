import { describe, expect, it } from "vitest";
import {
  buildAdminAuthCallbackPath,
  buildPlayerPasswordResetPath,
  hasAuthCallbackPayload,
  shouldRouteAuthPayloadToAdminCallback,
  shouldRouteAuthPayloadToPlayerReset
} from "@/lib/admin-auth-hash-redirect";

describe("admin auth hash redirect", () => {
  it("detects access tokens in the hash", () => {
    expect(hasAuthCallbackPayload("", "#access_token=abc&refresh_token=def")).toBe(true);
  });

  it("routes homepage auth payloads to the admin callback", () => {
    expect(
      shouldRouteAuthPayloadToAdminCallback("/", "", "#access_token=abc&refresh_token=def&type=invite")
    ).toBe(true);
  });

  it("does not loop on the callback path", () => {
    expect(
      shouldRouteAuthPayloadToAdminCallback(
        "/admin/auth/callback",
        "",
        "#access_token=abc&refresh_token=def"
      )
    ).toBe(false);
  });

  it("lets player reset links resolve inside the portal", () => {
    expect(
      shouldRouteAuthPayloadToAdminCallback(
        "/portal/reset",
        "",
        "#access_token=abc&refresh_token=def&type=recovery"
      )
    ).toBe(false);
  });

  it("routes recovery payloads on the homepage to the player reset page", () => {
    expect(
      shouldRouteAuthPayloadToPlayerReset("/", "", "#access_token=abc&refresh_token=def&type=recovery")
    ).toBe(true);
    expect(
      shouldRouteAuthPayloadToAdminCallback("/", "", "#access_token=abc&refresh_token=def&type=recovery")
    ).toBe(false);
  });

  it("preserves search and hash when building the player reset path", () => {
    expect(buildPlayerPasswordResetPath("?foo=1", "#access_token=abc&type=recovery")).toBe(
      "/portal/reset?foo=1#access_token=abc&type=recovery"
    );
  });

  it("preserves search and hash when building the callback path", () => {
    expect(buildAdminAuthCallbackPath("?foo=1", "#access_token=abc")).toBe(
      "/admin/auth/callback?foo=1#access_token=abc"
    );
  });
});
