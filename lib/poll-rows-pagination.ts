import { createAdminClient } from "@/lib/supabase-admin";

export const POLL_ROWS_PAGE_SIZE = 1000;

type PollRow = Record<string, unknown>;

/**
 * Load all poll rows with stable pagination (Supabase caps each request at 1000 rows).
 */
export async function loadAllPollRows(select: string): Promise<PollRow[]> {
  const supabase = createAdminClient();
  const rows: PollRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("polls")
      .select(select)
      .order("id", { ascending: true })
      .range(offset, offset + POLL_ROWS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];

    rows.push(...page);

    if (page.length < POLL_ROWS_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return rows;
}
