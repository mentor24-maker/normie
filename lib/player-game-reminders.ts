import { applyPollTestReminderContextOverrides } from "@/lib/poll-test-mode";
import type { PlayerReminderContext } from "@/lib/game-reminder-eval";
import { countProgressPolls } from "@/lib/player-poll-stats";
import { getAuthorizedPlayerFromCookieStore, type AuthorizedPlayer } from "@/lib/player-auth";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { isUuid } from "@/lib/public-request";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export type PlayerGameReminderDiagnosticReminder = {
  id: string;
  name: string;
  appearance: string;
  criterionSummary: string;
  matched: boolean;
  matchReason: string;
  queuedForDisplay: boolean;
  blockedByDismissal: boolean;
};

export type PlayerGameReminderDiagnostics = {
  loadedAt: string;
  playerId: string | null;
  evaluationSource: "authenticated" | "anonymous_session" | "empty";
  sessionId: string | null;
  loadError: string | null;
  activeReminderCount: number;
  context: {
    pollsTaken: number;
    loginCount: number;
    isRegistered: boolean;
    answeredPollIds: string[];
  };
  reminders: PlayerGameReminderDiagnosticReminder[];
  matchedSpeechBubbleCount: number;
  matchedStripCount: number;
};

export async function buildPlayerReminderContext(player: AuthorizedPlayer): Promise<PlayerReminderContext> {
  const supabase = createAdminClient();
  const [{ data: responseRows, error: responsesError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      supabase.from("poll_response").select("poll_id, is_skipped").eq("user_id", player.authUser.id),
      supabase.from("player_profiles").select("login_count").eq("id", player.authUser.id).maybeSingle()
    ]);

  if (responsesError) {
    throw new Error(responsesError.message);
  }

  if (profileError && !profileError.message.includes("login_count")) {
    throw new Error(profileError.message);
  }

  const rows = (responseRows ?? []) as Array<{ poll_id: string; is_skipped?: boolean | null }>;
  const answeredPollIds = new Set(rows.map((row) => row.poll_id).filter(Boolean));

  return {
    pollsTaken: countProgressPolls(rows),
    loginCount: Math.max(0, Number(profileRow?.login_count ?? 0)),
    answeredPollIds,
    isRegistered: true
  };
}

async function buildAnonymousSessionReminderContext(sessionId: string): Promise<PlayerReminderContext> {
  const supabase = createAdminClient();
  const { data: responseRows, error: responsesError } = await supabase
    .from("poll_response")
    .select("poll_id, is_skipped")
    .eq("session_id", sessionId);

  if (responsesError) {
    throw new Error(responsesError.message);
  }

  const rows = (responseRows ?? []) as Array<{ poll_id: string; is_skipped?: boolean | null }>;
  const answeredPollIds = new Set(rows.map((row) => row.poll_id).filter(Boolean));

  return {
    pollsTaken: countProgressPolls(rows),
    loginCount: 0,
    answeredPollIds,
    isRegistered: false
  };
}

export async function buildPlayerReminderContextFromCookies(cookieStore: ReadonlyRequestCookies): Promise<{
  context: PlayerReminderContext;
  playerId: string | null;
  evaluationSource: PlayerGameReminderDiagnostics["evaluationSource"];
  sessionId: string | null;
}> {
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (player) {
    return {
      context: await buildPlayerReminderContext(player),
      playerId: player.authUser.id,
      evaluationSource: "authenticated",
      sessionId: null
    };
  }

  const sessionId = cookieStore.get(POLL_SESSION_COOKIE)?.value?.trim() ?? "";

  if (sessionId && isUuid(sessionId)) {
    return {
      context: await buildAnonymousSessionReminderContext(sessionId),
      playerId: null,
      evaluationSource: "anonymous_session",
      sessionId
    };
  }

  return {
    context: {
      pollsTaken: 0,
      loginCount: 0,
      answeredPollIds: new Set(),
      isRegistered: false
    },
    playerId: null,
    evaluationSource: "empty",
    sessionId: null
  };
}

export async function buildPlayerReminderContextFromRequest(
  cookieStore: ReadonlyRequestCookies,
  options?: { host?: string | null }
): Promise<{
  context: PlayerReminderContext;
  playerId: string | null;
  evaluationSource: PlayerGameReminderDiagnostics["evaluationSource"];
  sessionId: string | null;
}> {
  const meta = await buildPlayerReminderContextFromCookies(cookieStore);

  return {
    ...meta,
    context: applyPollTestReminderContextOverrides(meta.context, cookieStore, options?.host)
  };
}
