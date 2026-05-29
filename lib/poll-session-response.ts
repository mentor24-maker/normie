import { NextResponse } from "next/server";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";

const POLL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function jsonWithPollSession<T extends Record<string, unknown>>(
  body: T,
  sessionId: string,
  init?: ResponseInit
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

  return response;
}
