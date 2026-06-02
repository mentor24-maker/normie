import { describe, expect, it } from "vitest";
import {
  isPublicSitePath,
  shouldShowPublicPageDiagnostics,
  truncateDiagnosticId
} from "./public-page-diagnostics";

describe("shouldShowPublicPageDiagnostics", () => {
  it("shows on localhost public routes only", () => {
    expect(shouldShowPublicPageDiagnostics("localhost:3000", "/")).toBe(true);
    expect(shouldShowPublicPageDiagnostics("localhost:3000", "/blog")).toBe(true);
    expect(shouldShowPublicPageDiagnostics("localhost:3000", "/portal/dashboard")).toBe(false);
    expect(shouldShowPublicPageDiagnostics("localhost:3000", "/admin/game")).toBe(false);
    expect(shouldShowPublicPageDiagnostics("www.normie.one", "/")).toBe(false);
  });
});

describe("isPublicSitePath", () => {
  it("excludes admin and portal", () => {
    expect(isPublicSitePath("/about")).toBe(true);
    expect(isPublicSitePath("/portal")).toBe(false);
  });
});

describe("truncateDiagnosticId", () => {
  it("shortens long ids for the hud", () => {
    expect(truncateDiagnosticId("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400…55440000");
    expect(truncateDiagnosticId(null)).toBe("—");
  });
});
