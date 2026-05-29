import { NextResponse } from "next/server";
import {
  applyPlayerSessionCookies,
  buildPlayerSessionSnapshot,
  resolvePlayerProfileForLogin,
  safePlayerText
} from "@/lib/player-auth";
import { clearPollSessionCookie } from "@/lib/poll-session-cookie";
import { createPublicClient } from "@/lib/supabase-public";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  };
  const accessToken = safePlayerText(body.accessToken, 4000);
  const refreshToken = safePlayerText(body.refreshToken, 4000);

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Confirmation session tokens are missing." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Confirmation session could not be verified." }, { status: 401 });
  }

  const profileResult = await resolvePlayerProfileForLogin(data.user);

  if (!profileResult.ok) {
    const status = profileResult.code === "missing_schema" || profileResult.code === "missing_profile" ? 503 : 403;
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
