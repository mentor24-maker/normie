import {
  fetchPlayerProfileRow,
  isMissingPlayerSchemaError,
  isMissingProfileColumnError,
  safePlayerText,
  type AuthorizedPlayer,
  type PlayerProfileRow
} from "@/lib/player-auth";
import {
  pollCategoriesEqual,
  pollCategorySlugMatchesAny,
  slugifyPollCategory
} from "@/lib/poll-categories";
import { listPollCategories } from "@/lib/poll-category-store";
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

function normalizePreferredSlug(value: unknown, validSlugs: ReadonlySet<string>): string | null {
  const raw = safePlayerText(value, 255);

  if (!raw) {
    return null;
  }

  const slug = slugifyPollCategory(raw);

  if (!slug || !validSlugs.has(slug)) {
    return null;
  }

  return slug;
}

export function normalizePreferredPollCategories(
  value: unknown,
  validSlugs: ReadonlySet<string> = new Set()
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    const slug = normalizePreferredSlug(entry, validSlugs);

    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    normalized.push(slug);
  }

  return normalized;
}

export function normalizeDefaultPlayPollCategory(
  value: unknown,
  preferredPollCategories: string[],
  validSlugs: ReadonlySet<string> = new Set()
): string {
  const slug = normalizePreferredSlug(value, validSlugs);

  if (!slug) {
    return "";
  }

  if (preferredPollCategories.length > 0 && !pollCategorySlugMatchesAny(slug, preferredPollCategories)) {
    return "";
  }

  return slug;
}

export async function buildPlayerPreferences(profile: PlayerProfileRow): Promise<PlayerPreferences> {
  const supabase = createAdminClient();
  const categories = await listPollCategories(supabase);
  const validSlugs = new Set(categories.map((category) => category.slug));
  const preferredPollCategories = normalizePreferredPollCategories(profile.preferred_poll_categories, validSlugs);
  const defaultPlayPollCategory = normalizeDefaultPlayPollCategory(
    profile.default_play_poll_category,
    preferredPollCategories,
    validSlugs
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

  const existing = await buildPlayerPreferences(existingProfile);
  const supabase = createAdminClient();
  const categories = await listPollCategories(supabase);
  const validSlugs = new Set(categories.map((category) => category.slug));
  const preferredPollCategories =
    input.preferredPollCategories !== undefined
      ? normalizePreferredPollCategories(input.preferredPollCategories, validSlugs)
      : existing.preferredPollCategories;
  const defaultPlayPollCategory =
    input.defaultPlayPollCategory !== undefined
      ? normalizeDefaultPlayPollCategory(input.defaultPlayPollCategory, preferredPollCategories, validSlugs)
      : existing.defaultPlayPollCategory;

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
    preferences: await buildPlayerPreferences(data as PlayerProfileRow)
  };
}
