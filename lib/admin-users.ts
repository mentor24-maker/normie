import type { User } from "@supabase/supabase-js";

export const TEAM_USER_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export const TEAM_USER_STATUSES = ["active", "invited", "suspended"] as const;

export type UserRole = (typeof TEAM_USER_ROLES)[number];
export type UserStatus = (typeof TEAM_USER_STATUSES)[number];

export type UserProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string;
  emailConfirmedAt: string;
};

export function safeUserText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeUserRole(value: unknown): UserRole {
  const candidate = safeUserText(value, 40).toLowerCase();
  return TEAM_USER_ROLES.includes(candidate as UserRole)
    ? (candidate as UserRole)
    : "editor";
}

export function normalizeUserStatus(value: unknown): UserStatus {
  const candidate = safeUserText(value, 40).toLowerCase();
  return TEAM_USER_STATUSES.includes(candidate as UserStatus)
    ? (candidate as UserStatus)
    : "active";
}

export function mergeAdminUserRecord(
  authUser: User,
  profile?: UserProfileRow | null
): AdminUserRecord {
  const metadata = authUser.user_metadata ?? {};

  return {
    id: authUser.id,
    email: safeUserText(authUser.email, 255),
    fullName: safeUserText(profile?.full_name ?? metadata.full_name, 255),
    role: normalizeUserRole(profile?.role ?? authUser.app_metadata?.role),
    status: normalizeUserStatus(profile?.status),
    notes: safeUserText(profile?.notes, 4000),
    createdAt: safeUserText(profile?.created_at ?? authUser.created_at, 120),
    updatedAt: safeUserText(profile?.updated_at ?? authUser.updated_at ?? authUser.created_at, 120),
    lastSignInAt: safeUserText(authUser.last_sign_in_at, 120),
    emailConfirmedAt: safeUserText(authUser.email_confirmed_at, 120)
  };
}
