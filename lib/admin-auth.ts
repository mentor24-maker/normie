import type { User } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { UserProfileRow } from "./admin-users";
import { resolveAdminTeamProfileForAuthUser } from "./admin-team-session";
import { createAdminClient } from "./supabase-admin";
import { createPublicClient } from "./supabase-public";

export const ADMIN_ACCESS_COOKIE = "normie_admin_access_token";
export const ADMIN_REFRESH_COOKIE = "normie_admin_refresh_token";
export const ADMIN_PROFILE_COOKIE = "normie_admin_profile";

export type AdminSessionSnapshot = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
};

export type AuthorizedAdmin = {
  authUser: User;
  profile: UserProfileRow;
};

export type RefreshedAdminSession = {
  accessToken: string;
  refreshToken: string;
  snapshot: AdminSessionSnapshot;
};

export type ResolvedAdminSession = {
  admin: AuthorizedAdmin;
  refreshed?: RefreshedAdminSession;
};

function createCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function getAdminCookieOptions() {
  return {
    access: createCookieOptions(60 * 60 * 8),
    refresh: createCookieOptions(60 * 60 * 24 * 14),
    profile: createCookieOptions(60 * 60 * 8)
  };
}

export function clearAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

export function applyAdminSessionCookies(
  response: {
    cookies: {
      set: (name: string, value: string, options: ReturnType<typeof createCookieOptions>) => void;
    };
  },
  accessToken: string,
  refreshToken: string,
  snapshot?: AdminSessionSnapshot
) {
  const options = getAdminCookieOptions();
  response.cookies.set(ADMIN_ACCESS_COOKIE, accessToken, options.access);
  response.cookies.set(ADMIN_REFRESH_COOKIE, refreshToken, options.refresh);

  if (snapshot) {
    response.cookies.set(ADMIN_PROFILE_COOKIE, JSON.stringify(snapshot), options.profile);
  }
}

export function buildAdminSessionSnapshot(authUser: User, profile: UserProfileRow): AdminSessionSnapshot {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    fullName: profile.full_name ?? String(authUser.user_metadata?.full_name ?? ""),
    role: profile.role ?? String(authUser.app_metadata?.role ?? "admin"),
    status: profile.status ?? "active"
  };
}

export async function getAdminUserFromToken(accessToken: string | undefined | null): Promise<User | null> {
  if (!accessToken) {
    return null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function getAdminProfile(userId: string): Promise<UserProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("team_users")
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserProfileRow;
}

export async function getAuthorizedAdminFromToken(
  accessToken: string | undefined | null
): Promise<AuthorizedAdmin | null> {
  const authUser = await getAdminUserFromToken(accessToken);

  if (!authUser) {
    return null;
  }

  try {
    const profile = await resolveAdminTeamProfileForAuthUser(authUser);

    if (!profile || profile.status !== "active") {
      return null;
    }

    return {
      authUser,
      profile
    };
  } catch {
    return null;
  }
}

async function refreshAdminAccessSession(refreshToken: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    return null;
  }

  const admin = await getAuthorizedAdminFromToken(data.session.access_token);

  if (!admin) {
    return null;
  }

  return {
    admin,
    refreshed: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      snapshot: buildAdminSessionSnapshot(data.user, admin.profile)
    }
  } satisfies ResolvedAdminSession;
}

export async function resolveAuthorizedAdminFromCookieStore(
  cookieStore: Pick<ReadonlyRequestCookies, "get">
): Promise<ResolvedAdminSession | null> {
  try {
    const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
    const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

    const fromAccessToken = await getAuthorizedAdminFromToken(accessToken);

    if (fromAccessToken) {
      return { admin: fromAccessToken };
    }

    if (!refreshToken) {
      return null;
    }

    return refreshAdminAccessSession(refreshToken);
  } catch {
    return null;
  }
}

export async function getAdminUserFromCookieStore(cookieStore: Pick<ReadonlyRequestCookies, "get">) {
  const resolved = await resolveAuthorizedAdminFromCookieStore(cookieStore);
  return resolved?.admin.authUser ?? null;
}

export async function getAuthorizedAdminFromCookieStore(cookieStore: Pick<ReadonlyRequestCookies, "get">) {
  const resolved = await resolveAuthorizedAdminFromCookieStore(cookieStore);
  return resolved?.admin ?? null;
}
