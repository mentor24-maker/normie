import type { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearPlayerCookieOptions,
  getAuthorizedPlayerFromCookieStore,
  PLAYER_ACCESS_COOKIE,
  PLAYER_PROFILE_COOKIE,
  PLAYER_REFRESH_COOKIE
} from "@/lib/player-auth";
import { PLAYER_LEVEL_UP_PENDING_COOKIE } from "@/lib/player-level-up-event";
import { applyPollTestModeCookies, isLocalhostPollTestHost } from "@/lib/poll-test-mode";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { isUuid, safePublicText } from "@/lib/public-request";
import { createAdminClient } from "@/lib/supabase-admin";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const POLL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type PollTestBrowserResetSummary = {
  ok: true;
  newSessionId: string;
  priorSessionId: string | null;
  backupSessionId: string | null;
  playerId: string | null;
  deletedForSession: number;
  deletedForBackupSession: number;
  deletedForPlayer: number;
};

async function deletePollResponsesForSession(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("poll_response")
    .delete({ count: "exact" })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function deletePollResponsesForPlayer(
  supabase: ReturnType<typeof createAdminClient>,
  playerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("poll_response")
    .delete({ count: "exact" })
    .eq("user_id", playerId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function applyFreshPollSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set(POLL_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: POLL_SESSION_MAX_AGE_SECONDS
  });
}

function clearBrowserIdentityCookies(response: NextResponse): void {
  const playerClear = clearPlayerCookieOptions();

  response.cookies.set(PLAYER_ACCESS_COOKIE, "", playerClear);
  response.cookies.set(PLAYER_REFRESH_COOKIE, "", playerClear);
  response.cookies.set(PLAYER_PROFILE_COOKIE, "", playerClear);
  response.cookies.set(PLAYER_LEVEL_UP_PENDING_COOKIE, "", {
    ...playerClear,
    path: "/portal"
  });
}

export async function resetPollTestBrowserData(
  request: Request,
  cookieStore: CookieStore,
  options?: { backupSessionId?: string | null }
): Promise<NextResponse> {
  if (!isLocalhostPollTestHost(request.headers.get("host"))) {
    return NextResponse.json(
      { error: "Poll test reset is only available on localhost:3000." },
      { status: 403 }
    );
  }

  const priorSessionId = safePublicText(cookieStore.get(POLL_SESSION_COOKIE)?.value, 120);
  const backupSessionId = safePublicText(options?.backupSessionId, 120);
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);
  const supabase = createAdminClient();

  let deletedForSession = 0;
  let deletedForBackupSession = 0;
  let deletedForPlayer = 0;

  if (priorSessionId && isUuid(priorSessionId)) {
    deletedForSession = await deletePollResponsesForSession(supabase, priorSessionId);
  }

  if (
    backupSessionId &&
    isUuid(backupSessionId) &&
    backupSessionId !== priorSessionId
  ) {
    deletedForBackupSession = await deletePollResponsesForSession(supabase, backupSessionId);
  }

  if (player) {
    deletedForPlayer = await deletePollResponsesForPlayer(supabase, player.authUser.id);
  }

  const newSessionId = crypto.randomUUID();
  const summary: PollTestBrowserResetSummary = {
    ok: true,
    newSessionId,
    priorSessionId: priorSessionId && isUuid(priorSessionId) ? priorSessionId : null,
    backupSessionId: backupSessionId && isUuid(backupSessionId) ? backupSessionId : null,
    playerId: player?.authUser.id ?? null,
    deletedForSession,
    deletedForBackupSession,
    deletedForPlayer
  };

  const response = NextResponse.json(summary);
  clearBrowserIdentityCookies(response);
  applyFreshPollSessionCookie(response, newSessionId);
  applyPollTestModeCookies(response, { enabled: false, pinPollId: null, progress: null });

  return response;
}
