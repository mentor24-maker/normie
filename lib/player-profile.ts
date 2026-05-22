import {
  getPlayerProfile,
  isMissingPlayerSchemaError,
  normalizePlayerHandle,
  safePlayerText,
  type AuthorizedPlayer,
  type PlayerProfileRow
} from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export type PlayerSocialLinks = {
  website: string;
  x: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  discord: string;
};

export type PlayerProfileDetails = {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  socialLinks: PlayerSocialLinks;
  shareProfile: boolean;
  sharePollResponses: boolean;
};

export const EMPTY_PLAYER_SOCIAL_LINKS: PlayerSocialLinks = {
  website: "",
  x: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  discord: ""
};

const PROFILE_SELECT =
  "id, full_name, handle, status, avatar_url, bio, social_links, share_profile, share_poll_responses, created_at, updated_at";

export function parsePlayerSocialLinks(value: unknown): PlayerSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_PLAYER_SOCIAL_LINKS };
  }

  const record = value as Record<string, unknown>;

  return {
    website: safePlayerText(record.website, 500),
    x: safePlayerText(record.x, 500),
    instagram: safePlayerText(record.instagram, 500),
    tiktok: safePlayerText(record.tiktok, 500),
    youtube: safePlayerText(record.youtube, 500),
    discord: safePlayerText(record.discord, 120)
  };
}

function normalizeOptionalUrl(value: unknown, max = 500): string {
  const trimmed = safePlayerText(value, max);

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function normalizePlayerSocialLinks(value: unknown): PlayerSocialLinks {
  const parsed = parsePlayerSocialLinks(value);

  return {
    website: normalizeOptionalUrl(parsed.website),
    x: normalizeOptionalUrl(parsed.x),
    instagram: normalizeOptionalUrl(parsed.instagram),
    tiktok: normalizeOptionalUrl(parsed.tiktok),
    youtube: normalizeOptionalUrl(parsed.youtube),
    discord: safePlayerText(parsed.discord, 120)
  };
}

export function normalizeAvatarUrl(value: unknown): string {
  const trimmed = safePlayerText(value, 2000);

  if (!trimmed) {
    return "";
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

export function buildPlayerProfileDetails(
  player: AuthorizedPlayer,
  profile: PlayerProfileRow
): PlayerProfileDetails {
  return {
    id: profile.id,
    email: player.authUser.email ?? "",
    fullName: safePlayerText(profile.full_name, 255),
    handle: safePlayerText(profile.handle, 40),
    avatarUrl: normalizeAvatarUrl(profile.avatar_url),
    bio: safePlayerText(profile.bio, 500),
    socialLinks: parsePlayerSocialLinks(profile.social_links),
    shareProfile: Boolean(profile.share_profile),
    sharePollResponses: Boolean(profile.share_poll_responses)
  };
}

export async function getPlayerProfileDetails(player: AuthorizedPlayer): Promise<PlayerProfileDetails | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("player_profiles")
    .select(PROFILE_SELECT)
    .eq("id", player.authUser.id)
    .maybeSingle();

  if (isMissingPlayerSchemaError(error)) {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return buildPlayerProfileDetails(player, data as PlayerProfileRow);
}

export type UpdatePlayerProfileInput = {
  fullName?: unknown;
  handle?: unknown;
  avatarUrl?: unknown;
  bio?: unknown;
  socialLinks?: unknown;
  shareProfile?: unknown;
  sharePollResponses?: unknown;
};

export type UpdatePlayerProfileResult =
  | { ok: true; profile: PlayerProfileDetails; profileRow: PlayerProfileRow }
  | { ok: false; error: string; status: number };

export async function updatePlayerProfile(
  player: AuthorizedPlayer,
  input: UpdatePlayerProfileInput
): Promise<UpdatePlayerProfileResult> {
  const fullName = safePlayerText(input.fullName, 255);
  const handle = normalizePlayerHandle(input.handle, player.authUser.email);
  const avatarUrl = normalizeAvatarUrl(input.avatarUrl);
  const bio = safePlayerText(input.bio, 500);
  const socialLinks = normalizePlayerSocialLinks(input.socialLinks);
  const shareProfile = input.shareProfile === true || input.shareProfile === "true";
  const sharePollResponses =
    input.sharePollResponses === true || input.sharePollResponses === "true";

  if (!fullName) {
    return { ok: false, error: "Display name is required.", status: 400 };
  }

  if (!handle) {
    return { ok: false, error: "Username is required.", status: 400 };
  }

  const supabase = createAdminClient();

  const { data: handleConflict, error: handleConflictError } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", player.authUser.id)
    .maybeSingle();

  if (isMissingPlayerSchemaError(handleConflictError)) {
    return {
      ok: false,
      error: "Player Portal profile fields are not installed yet. Apply the latest Supabase migrations.",
      status: 503
    };
  }

  if (handleConflictError) {
    return { ok: false, error: handleConflictError.message, status: 500 };
  }

  if (handleConflict) {
    return { ok: false, error: "That username is already taken.", status: 409 };
  }

  const { data, error } = await supabase
    .from("player_profiles")
    .update({
      full_name: fullName,
      handle,
      avatar_url: avatarUrl || null,
      bio,
      social_links: socialLinks,
      share_profile: shareProfile,
      share_poll_responses: sharePollResponses,
      updated_at: new Date().toISOString()
    })
    .eq("id", player.authUser.id)
    .select(PROFILE_SELECT)
    .single();

  if (isMissingPlayerSchemaError(error)) {
    return {
      ok: false,
      error: "Player Portal profile fields are not installed yet. Apply the latest Supabase migrations.",
      status: 503
    };
  }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Profile could not be saved.", status: 500 };
  }

  const profileRow = data as PlayerProfileRow;

  return {
    ok: true,
    profile: buildPlayerProfileDetails(player, profileRow),
    profileRow
  };
}

export async function refreshPlayerProfileFromDatabase(
  player: AuthorizedPlayer
): Promise<PlayerProfileRow | null> {
  return getPlayerProfile(player.authUser.id);
}
