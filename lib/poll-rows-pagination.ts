import { createAdminClient } from "@/lib/supabase-admin";

export const POLL_ROWS_PAGE_SIZE = 1000;

export type PollImageUrlRow = { image_url: string | null };
export type PollIdImageUrlRow = { id: string; image_url: string | null };
export type PollIdQuestionImageUrlRow = { id: string; question: string; image_url: string | null };

async function fetchAllPollPages<T>(loadPage: (offset: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await loadPage(offset);

    rows.push(...page);

    if (page.length < POLL_ROWS_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return rows;
}

/** Load every poll `image_url` (paginated past the Supabase 1000-row cap). */
export async function loadAllPollImageUrlRows(): Promise<PollImageUrlRow[]> {
  const supabase = createAdminClient();

  return fetchAllPollPages(async (offset) => {
    const { data, error } = await supabase
      .from("polls")
      .select("image_url")
      .order("id", { ascending: true })
      .range(offset, offset + POLL_ROWS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });
}

/** Load every poll `id` and `image_url` for gallery link sync. */
export async function loadAllPollIdImageUrlRows(): Promise<PollIdImageUrlRow[]> {
  const supabase = createAdminClient();

  return fetchAllPollPages(async (offset) => {
    const { data, error } = await supabase
      .from("polls")
      .select("id, image_url")
      .order("id", { ascending: true })
      .range(offset, offset + POLL_ROWS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });
}

/** Load poll rows for local gallery-link diagnostics. */
export async function loadAllPollIdQuestionImageUrlRows(): Promise<PollIdQuestionImageUrlRow[]> {
  const supabase = createAdminClient();

  return fetchAllPollPages(async (offset) => {
    const { data, error } = await supabase
      .from("polls")
      .select("id, question, image_url")
      .order("id", { ascending: true })
      .range(offset, offset + POLL_ROWS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });
}
