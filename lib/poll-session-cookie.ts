import type { NextResponse } from "next/server";

export const POLL_SESSION_COOKIE = "poll_session_id";

export function clearPollSessionCookie(response: NextResponse): void {
  response.cookies.set(POLL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
