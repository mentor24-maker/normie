import { describe, expect, it } from "vitest";
import { adminHasPermission, canAssignTeamRole, canManageExistingTeamMember } from "@/lib/admin-rbac";

describe("adminHasPermission", () => {
  it("allows viewers to read but not write content", () => {
    expect(adminHasPermission("viewer", "content:read")).toBe(true);
    expect(adminHasPermission("viewer", "content:write")).toBe(false);
  });

  it("allows editors to write content but not manage users", () => {
    expect(adminHasPermission("editor", "content:write")).toBe(true);
    expect(adminHasPermission("editor", "users:write")).toBe(false);
  });

  it("allows owners full team permissions", () => {
    expect(adminHasPermission("owner", "team:write")).toBe(true);
  });
});

describe("team role guards", () => {
  it("only owners can assign the owner role", () => {
    expect(canAssignTeamRole("owner", "owner")).toBe(true);
    expect(canAssignTeamRole("admin", "owner")).toBe(false);
    expect(canAssignTeamRole("admin", "editor")).toBe(true);
  });

  it("only owners can manage existing owners", () => {
    expect(canManageExistingTeamMember("owner", "owner")).toBe(true);
    expect(canManageExistingTeamMember("admin", "owner")).toBe(false);
    expect(canManageExistingTeamMember("admin", "editor")).toBe(true);
  });
});
