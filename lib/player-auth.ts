import type { User } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { createAdminClient } from "./supabase-admin";
import { createPublicClient } from "./supabase-public";

export const PLAYER_ACCESS_COOKIE = "normie_player_access_token";
export const PLAYER_REFRESH_COOKIE = "normie_player_refresh_token";
export const PLAYER_PROFILE_COOKIE = "normie_player_profile";

export type PlayerProfileRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  status: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  social_links?: Record<string, unknown> | null;
  share_profile?: boolean | null;
  share_poll_responses?: boolean | null;
  preferred_poll_categories?: unknown;
  default_play_poll_category?: string | null;
  crypto_wallets?: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export type PlayerSessionSnapshot = {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  status: string;
};

export type AuthorizedPlayer = {
  authUser: User;
  profile: PlayerProfileRow;
};

export const PLAYER_PROFILE_BASE_SELECT =
  "id, full_name, handle, status, created_at, updated_at";

export const PLAYER_PROFILE_EXTENDED_SELECT =
  "avatar_url, bio, social_links, share_profile, share_poll_responses";

export const PLAYER_PROFILE_PREFERENCES_SELECT =
  "preferred_poll_categories, default_play_poll_category";

export const PLAYER_PROFILE_FULL_SELECT =
  "id, full_name, handle, status, created_at, updated_at, avatar_url, bio, social_links, share_profile, share_poll_responses, preferred_poll_categories, default_play_poll_category";

export function isMissingPlayerSchemaError(error: { message?: string; code?: string } | null | undefined) {
  return Boolean(
    error &&
      (error.code === "PGRST205" ||
        error.message?.includes("Could not find the table") ||
        error.message?.includes("schema cache"))
  );
}

export function isMissingProfileColumnError(error: { message?: string; code?: string } | null | undefined) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        (error.message?.includes("column") && error.message?.includes("player_profiles")))
  );
}

function createCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function clearPlayerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

export function getPlayerCookieOptions() {
  return {
    access: createCookieOptions(60 * 60 * 24 * 14),
    refresh: createCookieOptions(60 * 60 * 24 * 30),
    profile: createCookieOptions(60 * 60 * 24 * 14)
  };
}

export function safePlayerText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizePlayerHandle(value: unknown, fallbackEmail?: string | null) {
  const candidate = safePlayerText(value, 40)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  if (candidate) {
    return candidate;
  }

  return (
    safePlayerText(fallbackEmail?.split("@")[0], 40)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "player"
  );
}

export function buildPlayerSessionSnapshot(
  authUser: User,
  profile: PlayerProfileRow
): PlayerSessionSnapshot {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    fullName: profile.full_name ?? String(authUser.user_metadata?.full_name ?? ""),
    handle: profile.handle ?? normalizePlayerHandle(authUser.user_metadata?.handle, authUser.email),
    status: profile.status ?? "active"
  };
}

export function applyPlayerSessionCookies(
  response: {
    cookies: {
      set: (name: string, value: string, options: ReturnType<typeof createCookieOptions>) => void;
    };
  },
  accessToken: string,
  refreshToken: string,
  snapshot?: PlayerSessionSnapshot
) {
  const options = getPlayerCookieOptions();
  response.cookies.set(PLAYER_ACCESS_COOKIE, accessToken, options.access);
  response.cookies.set(PLAYER_REFRESH_COOKIE, refreshToken, options.refresh);

  if (snapshot) {
    response.cookies.set(PLAYER_PROFILE_COOKIE, JSON.stringify(snapshot), options.profile);
  }
}

function parsePlayerSessionSnapshot(rawValue: string | undefined): PlayerSessionSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PlayerSessionSnapshot>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.handle !== "string" ||
      typeof parsed.status !== "string"
    ) {
      return null;
    }

    return parsed as PlayerSessionSnapshot;
  } catch {
    return null;
  }
}

export async function getPlayerUserFromToken(accessToken: string | undefined | null): Promise<User | null> {
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

export async function fetchPlayerProfileRow(
  userId: string,
  options?: { includeExtended?: boolean; select?: string }
): Promise<PlayerProfileRow | null> {
  const supabase = createAdminClient();
  const includeExtended = options?.includeExtended ?? false;
  const selectColumns =
    options?.select ?? (includeExtended ? PLAYER_PROFILE_FULL_SELECT : PLAYER_PROFILE_BASE_SELECT);

  let { data, error } = await supabase
    .from("player_profiles")
    .select(selectColumns)
    .eq("id", userId)
    .maybeSingle();

  if (isMissingProfileColumnError(error) && includeExtended && !options?.select) {
    ({ data, error } = await supabase
      .from("player_profiles")
      .select(PLAYER_PROFILE_BASE_SELECT)
      .eq("id", userId)
      .maybeSingle());
  }

  if (isMissingPlayerSchemaError(error)) {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return data as unknown as PlayerProfileRow;
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfileRow | null> {
  return fetchPlayerProfileRow(userId);
}

async function resolveUniquePlayerHandle(
  userId: string,
  preferredHandle: string
): Promise<string> {
  const supabase = createAdminClient();
  let candidate = preferredHandle;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("handle", candidate)
      .maybeSingle();

    if (isMissingPlayerSchemaError(error)) {
      return preferredHandle;
    }

    if (error) {
      return preferredHandle;
    }

    if (!data || data.id === userId) {
      return candidate;
    }

    const suffix = attempt === 0 ? userId.slice(0, 6) : `${userId.slice(0, 4)}${attempt}`;
    candidate = `${preferredHandle.slice(0, Math.max(4, 24 - suffix.length - 1))}_${suffix}`;
  }

  return `player_${userId.slice(0, 8)}`;
}

export async function ensurePlayerProfileForAuthUser(authUser: User): Promise<PlayerProfileRow | null> {
  const existing = await getPlayerProfile(authUser.id);

  if (existing) {
    return existing;
  }

  const supabase = createAdminClient();
  const preferredHandle = normalizePlayerHandle(authUser.user_metadata?.handle, authUser.email);
  const handle = await resolveUniquePlayerHandle(authUser.id, preferredHandle);
  const fullName = safePlayerText(authUser.user_metadata?.full_name, 255);

  const { data, error } = await supabase
    .from("player_profiles")
    .upsert(
      {
        id: authUser.id,
        full_name: fullName,
        handle,
        status: "active"
      },
      { onConflict: "id" }
    )
    .select(PLAYER_PROFILE_BASE_SELECT)
    .single();

  if (isMissingPlayerSchemaError(error)) {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return data as PlayerProfileRow;
}

export type PlayerLoginProfileResult =
  | { ok: true; profile: PlayerProfileRow }
  | {
      ok: false;
      code: "missing_schema" | "missing_profile" | "inactive";
      error: string;
    };

export async function resolvePlayerProfileForLogin(authUser: User): Promise<PlayerLoginProfileResult> {
  let profile = await getPlayerProfile(authUser.id);

  if (!profile) {
    profile = await ensurePlayerProfileForAuthUser(authUser);
  }

  if (!profile) {
    const schemaProbe = await createAdminClient().from("player_profiles").select("id").limit(1);

    if (isMissingPlayerSchemaError(schemaProbe.error)) {
      return {
        ok: false,
        code: "missing_schema",
        error:
          "Player Portal database tables are not installed yet. Apply supabase/migrations/005_player_portal.sql and try again."
      };
    }

    return {
      ok: false,
      code: "missing_profile",
      error: "No player profile exists for this account yet. Register again or contact support."
    };
  }

  const status = safePlayerText(profile.status, 40).toLowerCase() || "active";

  if (status === "suspended") {
    return {
      ok: false,
      code: "inactive",
      error: "This player account has been suspended."
    };
  }

  if (status !== "active") {
    return {
      ok: false,
      code: "inactive",
      error: "This player account is not active."
    };
  }

  return { ok: true, profile };
}

export async function getAuthorizedPlayerFromToken(
  accessToken: string | undefined | null
): Promise<AuthorizedPlayer | null> {
  const authUser = await getPlayerUserFromToken(accessToken);

  if (!authUser) {
    return null;
  }

  const profile = await getPlayerProfile(authUser.id);

  if (!profile) {
    return null;
  }

  const status = safePlayerText(profile.status, 40).toLowerCase() || "active";

  if (status !== "active" && status !== "") {
    return null;
  }

  return {
    authUser,
    profile
  };
}

export async function getAuthorizedPlayerFromCookieStore(
  cookieStore: Pick<ReadonlyRequestCookies, "get">
) {
  const accessToken = cookieStore.get(PLAYER_ACCESS_COOKIE)?.value;
  const snapshot = parsePlayerSessionSnapshot(cookieStore.get(PLAYER_PROFILE_COOKIE)?.value);

  if (accessToken && snapshot && snapshot.status === "active") {
    return {
      authUser: {
        id: snapshot.id,
        email: snapshot.email,
        aud: "authenticated",
        created_at: "",
        user_metadata: {
          full_name: snapshot.fullName,
          handle: snapshot.handle
        },
        app_metadata: {}
      } as unknown as User,
      profile: {
        id: snapshot.id,
        full_name: snapshot.fullName,
        handle: snapshot.handle,
        status: snapshot.status,
        created_at: null,
        updated_at: null
      }
    };
  }

  return getAuthorizedPlayerFromToken(accessToken);
}
