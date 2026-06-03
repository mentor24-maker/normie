import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatPollCategoryDisplayName,
  slugifyPollCategory,
  type PollCategorySeed
} from "@/lib/poll-categories";

export type PollCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export const POLL_CATEGORY_JOIN = "poll_categories(name, slug)";

export const POLL_CATEGORY_SELECT = "id, name, slug, sort_order";

const POLL_CATEGORY_ALIASES: Record<string, string> = {
  "future-and-past": "Future / Power",
  random: "Random"
};

type PollCategoryJoinRow = {
  name?: string | null;
  slug?: string | null;
};

export function readPollCategoryNameFromJoin(
  row:
    | {
        poll_categories?: PollCategoryJoinRow | PollCategoryJoinRow[] | null;
      }
    | null
    | undefined
): string | null {
  if (!row) {
    return null;
  }

  const joined = Array.isArray(row.poll_categories) ? row.poll_categories[0] : row.poll_categories;
  const name = joined?.name?.trim();

  return name || null;
}

export function mapPollRowWithCategory<
  T extends {
    category_id?: string | null;
    poll_categories?: PollCategoryJoinRow | PollCategoryJoinRow[] | null;
  }
>(
  row: T
): Omit<T, "poll_categories"> & {
  category: string | null;
  category_slug: string | null;
  category_id: string | null;
} {
  const joined = Array.isArray(row.poll_categories) ? row.poll_categories[0] : row.poll_categories;
  const { poll_categories: _pollCategories, ...rest } = row;

  return {
    ...rest,
    category: joined?.name ?? null,
    category_slug: joined?.slug ?? null,
    category_id: row.category_id ?? null
  };
}

export function pollCategoryRecordToSeed(record: PollCategoryRecord): PollCategorySeed {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug
  };
}

const LEGACY_POLL_CATEGORY_SLUG_ALIASES: Record<string, string> = {
  "behavior-and-habits": "behavior-habits",
  "hardware-and-os": "hardware-os",
  scenario: "scenarios"
};

function resolvePollCategorySlug(param: string): string {
  const slug = slugifyPollCategory(param);
  return LEGACY_POLL_CATEGORY_SLUG_ALIASES[slug] ?? slug;
}

function resolveAliasName(param: string): string | null {
  const normalized = resolvePollCategorySlug(param);
  return POLL_CATEGORY_ALIASES[normalized] ?? null;
}

export async function listPollCategories(supabase: SupabaseClient): Promise<PollCategoryRecord[]> {
  const { data, error } = await supabase
    .from("poll_categories")
    .select(POLL_CATEGORY_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    sort_order: Number(row.sort_order ?? 1000)
  }));
}

export async function findPollCategoryByParam(
  supabase: SupabaseClient,
  param: string | null | undefined
): Promise<PollCategoryRecord | null> {
  const raw = String(param ?? "").trim();

  if (!raw) {
    return null;
  }

  const aliasName = resolveAliasName(raw);

  if (aliasName) {
    const { data, error } = await supabase
      .from("poll_categories")
      .select(POLL_CATEGORY_SELECT)
      .ilike("name", aliasName)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        id: String(data.id),
        name: String(data.name),
        slug: String(data.slug),
        sort_order: Number(data.sort_order ?? 1000)
      };
    }
  }

  const slug = resolvePollCategorySlug(raw);

  if (slug) {
    const { data, error } = await supabase
      .from("poll_categories")
      .select(POLL_CATEGORY_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        id: String(data.id),
        name: String(data.name),
        slug: String(data.slug),
        sort_order: Number(data.sort_order ?? 1000)
      };
    }
  }

  const { data, error } = await supabase
    .from("poll_categories")
    .select(POLL_CATEGORY_SELECT)
    .ilike("name", raw)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug),
    sort_order: Number(data.sort_order ?? 1000)
  };
}

export async function ensurePollCategory(
  supabase: SupabaseClient,
  value: unknown
): Promise<PollCategoryRecord | null> {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const existing = await findPollCategoryByParam(supabase, raw);

  if (existing) {
    return existing;
  }

  const name = formatPollCategoryDisplayName(raw).slice(0, 255);
  const slug = resolvePollCategorySlug(name || raw);

  if (!name || !slug) {
    return null;
  }

  const { data, error } = await supabase
    .from("poll_categories")
    .upsert(
      {
        name,
        slug,
        sort_order: 1000,
        updated_at: new Date().toISOString()
      },
      { onConflict: "slug" }
    )
    .select(POLL_CATEGORY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug),
    sort_order: Number(data.sort_order ?? 1000)
  };
}

export async function resolvePollCategoryIdForWrite(
  supabase: SupabaseClient,
  value: unknown
): Promise<string | null> {
  const category = await ensurePollCategory(supabase, value);
  return category?.id ?? null;
}
