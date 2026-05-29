import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import {
  claimAnonymousPollSessionForPlayer,
  claimPollSessionForPlayerFromCookies
} from "@/lib/poll-response-claim";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { isUuid, safePublicText } from "@/lib/public-request";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to link previous polls." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown };
  const requestedSessionId = safePublicText(body.sessionId, 120);

  try {
    if (requestedSessionId) {
      if (!isUuid(requestedSessionId)) {
        return NextResponse.json({ error: "That browser session id is not valid." }, { status: 400 });
      }

      const result = await claimAnonymousPollSessionForPlayer(requestedSessionId, player.authUser.id);

      return NextResponse.json({
        ok: true,
        sessionId: requestedSessionId,
        ...result
      });
    }

    const cookieSessionId = safePublicText(cookieStore.get(POLL_SESSION_COOKIE)?.value, 120);

    if (cookieSessionId && isUuid(cookieSessionId)) {
      const result = await claimAnonymousPollSessionForPlayer(cookieSessionId, player.authUser.id);

      return NextResponse.json({
        ok: true,
        sessionId: cookieSessionId,
        ...result
      });
    }

    const cookieClaim = await claimPollSessionForPlayerFromCookies(cookieStore, player.authUser.id);

    if (cookieClaim) {
      return NextResponse.json({
        ok: true,
        sessionId: cookieSessionId || null,
        ...cookieClaim
      });
    }

    return NextResponse.json(
      {
        error:
          "No browser poll session was found. Play a poll on this device while signed out, then try again."
      },
      { status: 400 }
    );
  } catch (claimError) {
    return NextResponse.json(
      {
        error:
          claimError instanceof Error ? claimError.message : "Previous polls could not be linked."
      },
      { status: 500 }
    );
  }
}
