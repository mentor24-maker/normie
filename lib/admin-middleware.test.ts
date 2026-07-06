import { describe, expect, it } from "vitest";
import {
  isProtectedAdminApiRoute,
  isProtectedAdminPage,
  isPublicAdminApiRoute,
  isPublicAdminPage,
  requiresAdminSession
} from "./admin-middleware";

describe("isPublicAdminApiRoute", () => {
  it("allows only the three deliberate public POST endpoints", () => {
    expect(isPublicAdminApiRoute("/api/admin/session", "POST")).toBe(true);
    expect(isPublicAdminApiRoute("/api/admin/register", "POST")).toBe(true);
    expect(isPublicAdminApiRoute("/api/admin/session/oauth", "POST")).toBe(true);
  });

  it("allows logout via DELETE /api/admin/session", () => {
    expect(isPublicAdminApiRoute("/api/admin/session", "DELETE")).toBe(true);
  });

  it("keeps everything else protected", () => {
    expect(isPublicAdminApiRoute("/api/admin/session", "GET")).toBe(false);
    expect(isPublicAdminApiRoute("/api/admin/register", "GET")).toBe(false);
    expect(isPublicAdminApiRoute("/api/admin/users", "POST")).toBe(false);
    expect(isPublicAdminApiRoute("/api/admin/team", "GET")).toBe(false);
    expect(isPublicAdminApiRoute("/api/admin/session/oauth", "DELETE")).toBe(false);
  });
});

describe("isProtectedAdminApiRoute", () => {
  it("protects all admin API paths except the public auth endpoints", () => {
    expect(isProtectedAdminApiRoute("/api/admin/polls", "GET")).toBe(true);
    expect(isProtectedAdminApiRoute("/api/admin/team", "POST")).toBe(true);
    expect(isProtectedAdminApiRoute("/api/admin/session", "POST")).toBe(false);
  });

  it("protects the CSV import endpoint", () => {
    expect(isProtectedAdminApiRoute("/api/import", "POST")).toBe(true);
  });

  it("ignores non-admin paths", () => {
    expect(isProtectedAdminApiRoute("/api/polls/next", "GET")).toBe(false);
    expect(isProtectedAdminApiRoute("/api/player/profile", "GET")).toBe(false);
  });
});

describe("admin page classification", () => {
  it("treats the login and auth callback pages as public", () => {
    expect(isPublicAdminPage("/admin")).toBe(true);
    expect(isPublicAdminPage("/admin/auth/callback")).toBe(true);
    expect(isPublicAdminPage("/admin/dashboard")).toBe(false);
  });

  it("protects all other admin pages", () => {
    expect(isProtectedAdminPage("/admin/dashboard")).toBe(true);
    expect(isProtectedAdminPage("/admin/users")).toBe(true);
    expect(isProtectedAdminPage("/admin")).toBe(false);
    expect(isProtectedAdminPage("/admin/auth/callback")).toBe(false);
    expect(isProtectedAdminPage("/portal/dashboard")).toBe(false);
  });
});

describe("requiresAdminSession", () => {
  it("combines page and API protection", () => {
    expect(requiresAdminSession("/admin/dashboard", "GET")).toBe(true);
    expect(requiresAdminSession("/api/admin/polls", "GET")).toBe(true);
    expect(requiresAdminSession("/api/import", "POST")).toBe(true);
    expect(requiresAdminSession("/admin", "GET")).toBe(false);
    expect(requiresAdminSession("/api/admin/session", "POST")).toBe(false);
    expect(requiresAdminSession("/blog", "GET")).toBe(false);
    expect(requiresAdminSession("/api/polls/next", "GET")).toBe(false);
  });
});
