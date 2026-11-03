import { NextResponse } from "next/server";
import {
  PLAYER_ACCESS_COOKIE,
  PLAYER_PROFILE_COOKIE,
  PLAYER_REFRESH_COOKIE,
  clearPlayerCookieOptions
} from "@/lib/player-auth";
import { clearPollSessionCookie } from "@/lib/poll-session-cookie";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/portal", request.url));
  const options = clearPlayerCookieOptions();

  response.cookies.set(PLAYER_ACCESS_COOKIE, "", options);
  response.cookies.set(PLAYER_REFRESH_COOKIE, "", options);
  response.cookies.set(PLAYER_PROFILE_COOKIE, "", options);
  clearPollSessionCookie(response);

  return response;
}
