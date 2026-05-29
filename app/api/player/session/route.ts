import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PLAYER_ACCESS_COOKIE,
  PLAYER_PROFILE_COOKIE,
  PLAYER_REFRESH_COOKIE,
  applyPlayerSessionCookies,
  buildPlayerSessionSnapshot,
  clearPlayerCookieOptions,
  getAuthorizedPlayerFromCookieStore,
  resolvePlayerProfileForLogin,
  safePlayerText
} from "@/lib/player-auth";
import { clearPollSessionCookie } from "@/lib/poll-session-cookie";
import { createPublicClient } from "@/lib/supabase-public";

export async function GET() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: player.authUser.id,
      email: player.authUser.email ?? "",
      fullName: safePlayerText(player.profile.full_name ?? player.authUser.user_metadata?.full_name, 255),
      handle: safePlayerText(player.profile.handle ?? player.authUser.user_metadata?.handle, 40)
    }
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: unknown; password?: unknown };
  const email = safePlayerText(body.email, 255).toLowerCase();
  const password = safePlayerText(body.password, 255);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Invalid email or password." }, { status: 401 });
  }

  const profileResult = await resolvePlayerProfileForLogin(data.user);

  if (!profileResult.ok) {
    const status =
      profileResult.code === "missing_schema" || profileResult.code === "missing_profile" ? 503 : 403;

    return NextResponse.json({ error: profileResult.error }, { status });
  }

  const profile = profileResult.profile;

  const response = NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName: safePlayerText(profile.full_name ?? data.user.user_metadata?.full_name, 255),
      handle: safePlayerText(profile.handle ?? data.user.user_metadata?.handle, 40)
    }
  });

  applyPlayerSessionCookies(
    response,
    data.session.access_token,
    data.session.refresh_token,
    buildPlayerSessionSnapshot(data.user, profile)
  );
  clearPollSessionCookie(response);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  const options = clearPlayerCookieOptions();

  response.cookies.set(PLAYER_ACCESS_COOKIE, "", options);
  response.cookies.set(PLAYER_REFRESH_COOKIE, "", options);
  response.cookies.set(PLAYER_PROFILE_COOKIE, "", options);
  clearPollSessionCookie(response);

  return response;
}
