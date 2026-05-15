import { NextResponse } from "next/server";
import {
  applyAdminSessionCookies,
  buildAdminSessionSnapshot,
  getAdminProfile,
  getAdminUserFromToken
} from "@/lib/admin-auth";
import { safeUserText } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  };

  const accessToken = safeUserText(body.accessToken, 4000);
  const refreshToken = safeUserText(body.refreshToken, 4000);

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Missing OAuth session tokens." }, { status: 400 });
  }

  const authUser = await getAdminUserFromToken(accessToken);

  if (!authUser) {
    return NextResponse.json({ error: "Invalid OAuth session." }, { status: 401 });
  }

  const adminClient = createAdminClient();
  let profile = await getAdminProfile(authUser.id);

  if (!profile) {
    const { count, error: countError } = await adminClient
      .from("team_users")
      .select("id", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) === 0) {
      const fullName = safeUserText(authUser.user_metadata?.full_name, 255);
      const { error: bootstrapError } = await adminClient.from("team_users").upsert({
        id: authUser.id,
        full_name: fullName,
        role: "owner",
        status: "active",
        notes: "Bootstrap admin account via Google OAuth",
        updated_at: new Date().toISOString()
      });

      if (bootstrapError) {
        return NextResponse.json({ error: bootstrapError.message }, { status: 500 });
      }

      profile = await getAdminProfile(authUser.id);
    }
  }

  if (!profile || profile.status !== "active") {
    return NextResponse.json(
      { error: "This Google account is not authorized for admin access." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: authUser.id,
      email: authUser.email ?? "",
      fullName: safeUserText(profile.full_name ?? authUser.user_metadata?.full_name, 255)
    }
  });

  applyAdminSessionCookies(response, accessToken, refreshToken, buildAdminSessionSnapshot(authUser, profile));

  return response;
}
