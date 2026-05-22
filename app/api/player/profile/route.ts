import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyPlayerSessionCookies,
  buildPlayerSessionSnapshot,
  getAuthorizedPlayerFromCookieStore,
  PLAYER_ACCESS_COOKIE,
  PLAYER_REFRESH_COOKIE
} from "@/lib/player-auth";
import {
  getPlayerProfileDetails,
  updatePlayerProfile,
  type UpdatePlayerProfileInput
} from "@/lib/player-profile";

export async function GET() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  }

  const profile = await getPlayerProfileDetails(player);

  if (!profile) {
    return NextResponse.json({ error: "Profile could not be loaded." }, { status: 404 });
  }

  return NextResponse.json({ data: profile });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePlayerProfileInput;
  const result = await updatePlayerProfile(player, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ data: result.profile });
  const accessToken = cookieStore.get(PLAYER_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(PLAYER_REFRESH_COOKIE)?.value;

  if (accessToken && refreshToken) {
    applyPlayerSessionCookies(
      response,
      accessToken,
      refreshToken,
      buildPlayerSessionSnapshot(player.authUser, result.profileRow)
    );
  }

  return response;
}
