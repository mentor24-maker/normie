import type { AuthorizedAdmin } from "@/lib/admin-auth";
import { normalizeUserRole, type UserRole } from "@/lib/admin-users";

export const ADMIN_FORBIDDEN_CODE = "ADMIN_FORBIDDEN";

export type AdminPermission = "content:read" | "content:write" | "users:read" | "users:write" | "team:read" | "team:write";

const ROLE_PERMISSIONS: Record<UserRole, readonly AdminPermission[]> = {
  viewer: ["content:read", "users:read", "team:read"],
  editor: ["content:read", "content:write", "users:read", "team:read"],
  admin: ["content:read", "content:write", "users:read", "users:write", "team:read", "team:write"],
  owner: ["content:read", "content:write", "users:read", "users:write", "team:read", "team:write"]
};

export function getAdminRole(admin: AuthorizedAdmin): UserRole {
  return normalizeUserRole(admin.profile.role);
}

export function adminHasPermission(role: UserRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAssignTeamRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === "owner") {
    return actorRole === "owner";
  }

  return actorRole === "owner" || actorRole === "admin";
}

export function canManageExistingTeamMember(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === "owner") {
    return actorRole === "owner";
  }

  return actorRole === "owner" || actorRole === "admin";
}
