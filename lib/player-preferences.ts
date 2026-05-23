import {
  fetchPlayerProfileRow,
  isMissingPlayerSchemaError,
  isMissingProfileColumnError,
  safePlayerText,
  type AuthorizedPlayer,
  type PlayerProfileRow
} from "@/lib/player-auth";
import { POLL_CATEGORY_SEEDS, resolvePollCategoryName } from "@/lib/poll-categories";
import { createAdminClient } from "@/lib/supabase-admin";

const PREFERENCE_PROFILE_SELECT =
  "id, full_name, handle, status, created_at, updated_at, preferred_poll_categories, default_play_poll_category";

export type PlayerPreferences = {
  preferredPollCategories: string[];
  defaultPlayPollCategory: string;
};

export type UpdatePlayerPreferencesInput = {
  preferredPollCategories?: unknown;
  defaultPlayPollCategory?: unknown;
};

export type UpdatePlayerPreferencesResult =
  | { ok: true; preferences: PlayerPreferences }
  | { ok: false; error: string; status: number };

const CANONICAL_CATEGORY_NAMES = POLL_CATEGORY_SEEDS.map((category) => category.name);

export function normalizePreferredPollCategories(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    const resolved = resolvePollCategoryName(String(entry ?? ""));

    if (!resolved || seen.has(resolved)) {
      continue;
    }

    if (!CANONICAL_CATEGORY_NAMES.includes(resolved)) {
      continue;
    }

    seen.add(resolved);
    normalized.push(resolved);
  }

  return normalized;
}

export function normalizeDefaultPlayPollCategory(
  value: unknown,
  preferredPollCategories: string[]
): string {
  const raw = safePlayerText(value, 255);

  if (!raw) {
    return "";
  }

  const resolved = resolvePollCategoryName(raw);

  if (!resolved) {
    return "";
  }

  if (preferredPollCategories.length > 0 && !preferredPollCategories.includes(resolved)) {
    return "";
  }

  return CANONICAL_CATEGORY_NAMES.includes(resolved) ? resolved : "";
}

export function buildPlayerPreferences(profile: PlayerProfileRow): PlayerPreferences {
  const preferredPollCategories = normalizePreferredPollCategories(profile.preferred_poll_categories);
  const defaultPlayPollCategory = normalizeDefaultPlayPollCategory(
    profile.default_play_poll_category,
    preferredPollCategories
  );

  return {
    preferredPollCategories,
    defaultPlayPollCategory
  };
}

export async function getPlayerPreferences(player: AuthorizedPlayer): Promise<PlayerPreferences | null> {
  const profile = await fetchPlayerProfileRow(player.authUser.id, { select: PREFERENCE_PROFILE_SELECT });

  if (!profile) {
    return null;
  }

  return buildPlayerPreferences(profile);
}

export async function updatePlayerPreferences(
  player: AuthorizedPlayer,
  input: UpdatePlayerPreferencesInput
): Promise<UpdatePlayerPreferencesResult> {
  const existingProfile = await fetchPlayerProfileRow(player.authUser.id, {
    select: PREFERENCE_PROFILE_SELECT
  });

  if (!existingProfile) {
    return { ok: false, error: "Profile could not be loaded.", status: 404 };
  }

  const existing = buildPlayerPreferences(existingProfile);
  const preferredPollCategories =
    input.preferredPollCategories !== undefined
      ? normalizePreferredPollCategories(input.preferredPollCategories)
      : existing.preferredPollCategories;
  const defaultPlayPollCategory =
    input.defaultPlayPollCategory !== undefined
      ? normalizeDefaultPlayPollCategory(input.defaultPlayPollCategory, preferredPollCategories)
      : existing.defaultPlayPollCategory;

  const supabase = createAdminClient();
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("player_profiles")
    .update({
      preferred_poll_categories: preferredPollCategories,
      default_play_poll_category: defaultPlayPollCategory || null,
      updated_at: updatedAt
    })
    .eq("id", player.authUser.id)
    .select(PREFERENCE_PROFILE_SELECT)
    .single();

  if (isMissingProfileColumnError(error)) {
    return {
      ok: false,
      error: "Player preferences are not installed yet. Apply migration 014_player_preferences.sql.",
      status: 503
    };
  }

  if (isMissingPlayerSchemaError(error)) {
    return {
      ok: false,
      error: "Player Portal is not installed yet. Apply the latest Supabase migrations.",
      status: 503
    };
  }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Preferences could not be saved.", status: 500 };
  }

  return {
    ok: true,
    preferences: buildPlayerPreferences(data as PlayerProfileRow)
  };
}

