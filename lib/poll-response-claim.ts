import { isUuid, safePublicText } from "@/lib/public-request";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { createAdminClient } from "@/lib/supabase-admin";

export const POLL_SESSION_CLAIM_LIMIT = 500;
export const TOKENS_PER_CLAIMED_ANSWER = 1;

export type PollSessionClaimResult = {
  claimed: number;
  skippedDuplicate: number;
  removedAnonymousDuplicate: number;
};

type PollSessionCookieStore = {
  get: (name: string) => { value?: string } | undefined;
};

type AnonymousResponseRow = {
  id: string;
  poll_id: string;
};

export async function claimAnonymousPollSessionForPlayer(
  sessionId: string,
  userId: string
): Promise<PollSessionClaimResult> {
  const supabase = createAdminClient();
  const result: PollSessionClaimResult = {
    claimed: 0,
    skippedDuplicate: 0,
    removedAnonymousDuplicate: 0
  };

  const { data: anonymousRows, error: anonymousError } = await supabase
    .from("poll_response")
    .select("id, poll_id")
    .eq("session_id", sessionId)
    .is("user_id", null)
    .order("created_at", { ascending: true })
    .limit(POLL_SESSION_CLAIM_LIMIT);

  if (anonymousError) {
    throw new Error(anonymousError.message);
  }

  const rows = (anonymousRows ?? []) as AnonymousResponseRow[];

  if (rows.length === 0) {
    return result;
  }

  const { data: existingUserRows, error: existingUserError } = await supabase
    .from("poll_response")
    .select("poll_id")
    .eq("user_id", userId);

  if (existingUserError) {
    throw new Error(existingUserError.message);
  }

  const answeredPollIds = new Set((existingUserRows ?? []).map((row) => row.poll_id));

  for (const row of rows) {
    if (answeredPollIds.has(row.poll_id)) {
      const { error: deleteError } = await supabase.from("poll_response").delete().eq("id", row.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      result.removedAnonymousDuplicate += 1;
      result.skippedDuplicate += 1;
      continue;
    }

    const { error: claimError } = await supabase
      .from("poll_response")
      .update({
        user_id: userId,
        tokens_earned: TOKENS_PER_CLAIMED_ANSWER
      })
      .eq("id", row.id);

    if (claimError) {
      throw new Error(claimError.message);
    }

    answeredPollIds.add(row.poll_id);
    result.claimed += 1;
  }

  return result;
}

export async function claimPollSessionForPlayerFromCookies(
  cookieStore: PollSessionCookieStore,
  userId: string
): Promise<PollSessionClaimResult | null> {
  const sessionId = safePublicText(cookieStore.get(POLL_SESSION_COOKIE)?.value, 120);

  if (!sessionId || !isUuid(sessionId)) {
    return null;
  }

  return claimAnonymousPollSessionForPlayer(sessionId, userId);
}
