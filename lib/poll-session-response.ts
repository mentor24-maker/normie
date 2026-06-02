import { NextResponse } from "next/server";
import { applyPollTestModeCookies } from "@/lib/poll-test-mode";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";

export type PollTestModeCookieValues = {
  enabled: boolean;
  pinPollId?: string | null;
  progress?: number | null;
};

const POLL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function jsonWithPollSession<T extends Record<string, unknown>>(
  body: T,
  sessionId: string,
  init?: ResponseInit,
  pollTestMode?: PollTestModeCookieValues
): NextResponse {
  const response = NextResponse.json(
    {
      ...body,
      pollSessionId: sessionId
    },
    init
  );

  response.cookies.set(POLL_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: POLL_SESSION_MAX_AGE_SECONDS
  });

  if (pollTestMode) {
    applyPollTestModeCookies(response, pollTestMode);
  }

  return response;
}
