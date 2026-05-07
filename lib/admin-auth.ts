import type { User } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { UserProfileRow } from "./admin-users";
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

function parseAdminSessionSnapshot(rawValue: string | undefined): AdminSessionSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AdminSessionSnapshot>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.status !== "string"
    ) {
      return null;
    }

    return parsed as AdminSessionSnapshot;
  } catch {
    return null;
  }
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
    .from("users")
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

  const profile = await getAdminProfile(authUser.id);

  if (!profile || profile.status !== "active") {
    return null;
  }

  return {
    authUser,
    profile
  };
}

export async function getAdminUserFromCookieStore(cookieStore: Pick<ReadonlyRequestCookies, "get">) {
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  return getAdminUserFromToken(accessToken);
}

export async function getAuthorizedAdminFromCookieStore(cookieStore: Pick<ReadonlyRequestCookies, "get">) {
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const snapshot = parseAdminSessionSnapshot(cookieStore.get(ADMIN_PROFILE_COOKIE)?.value);

  if (accessToken && snapshot && snapshot.status === "active") {
    return {
      authUser: {
        id: snapshot.id,
        email: snapshot.email,
        aud: "authenticated",
        created_at: "",
        user_metadata: {
          full_name: snapshot.fullName
        },
        app_metadata: {
          role: snapshot.role
        }
      } as unknown as User,
      profile: {
        id: snapshot.id,
        full_name: snapshot.fullName,
        role: snapshot.role,
        status: snapshot.status,
        notes: null,
        created_at: null,
        updated_at: null
      }
    };
  }

  return getAuthorizedAdminFromToken(accessToken);
}
