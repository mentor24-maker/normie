import { buildPollCategoryCatalog, type PollCategorySeed } from "@/lib/poll-categories";
import { createAdminClient } from "@/lib/supabase-admin";

/** Polls Manager + public category list: seeds plus every distinct poll.category in the database. */
export async function loadPollCategoryCatalog(): Promise<PollCategorySeed[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("polls").select("category");

  if (error) {
    throw new Error(error.message);
  }

  const pollCategoryNames = (data ?? [])
    .map((row) => (typeof row.category === "string" ? row.category : ""))
    .filter((category) => category.trim().length > 0);

  return buildPollCategoryCatalog(pollCategoryNames);
}

export function sortPollCategoryNames(names: readonly string[]): string[] {
  return [...names].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}
