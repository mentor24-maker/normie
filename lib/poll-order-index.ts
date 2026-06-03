import type { SupabaseClient } from "@supabase/supabase-js";

const POLL_ORDER_INDEX_UNIQUE = "polls_order_index_key";

function isPollOrderIndexConflict(message: string) {
  return message.includes(POLL_ORDER_INDEX_UNIQUE);
}

/** Next unused poll order_index (queries the database; safe for concurrent creates). */
export async function getNextPollOrderIndex(supabase: SupabaseClient): Promise<number> {
  const { data: lastPoll, error } = await supabase
    .from("polls")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (lastPoll?.order_index ?? 0) + 1;
}

async function isPollOrderIndexAvailable(supabase: SupabaseClient, orderIndex: number) {
  const { data, error } = await supabase
    .from("polls")
    .select("id")
    .eq("order_index", orderIndex)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !data;
}

/**
 * Pick an order_index for a new poll. Uses `preferred` when it is free; otherwise allocates from DB max + 1.
 */
export async function resolvePollOrderIndexForCreate(
  supabase: SupabaseClient,
  preferred?: number
): Promise<number> {
  if (typeof preferred === "number" && Number.isFinite(preferred)) {
    if (await isPollOrderIndexAvailable(supabase, preferred)) {
      return preferred;
    }
  }

  return getNextPollOrderIndex(supabase);
}

/** Insert helper: retry with a fresh order_index when the unique constraint races. */
export async function allocatePollOrderIndexWithRetry(
  supabase: SupabaseClient,
  preferred?: number,
  maxAttempts = 5
): Promise<number> {
  let orderIndex = await resolvePollOrderIndexForCreate(supabase, preferred);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isPollOrderIndexAvailable(supabase, orderIndex)) {
      return orderIndex;
    }

    orderIndex = await getNextPollOrderIndex(supabase);
  }

  return orderIndex;
}

export function isPollOrderIndexUniqueViolation(message: string) {
  return isPollOrderIndexConflict(message);
}
