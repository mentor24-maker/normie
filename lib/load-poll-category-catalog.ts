import {
  listPollCategories,
  pollCategoryRecordToSeed,
  type PollCategoryRecord
} from "@/lib/poll-category-store";
import type { PollCategorySeed } from "@/lib/poll-categories";
import { createAdminClient } from "@/lib/supabase-admin";

/** Polls Manager + public category list from poll_categories table. */
export async function loadPollCategoryCatalog(): Promise<PollCategorySeed[]> {
  const supabase = createAdminClient();
  const categories = await listPollCategories(supabase);
  return categories.map(pollCategoryRecordToSeed);
}

export function sortPollCategoryNames(names: readonly string[]): string[] {
  return [...names].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

export type { PollCategoryRecord };
