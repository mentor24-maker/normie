import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_PROFILE_COOKIE,
  ADMIN_REFRESH_COOKIE,
  applyAdminSessionCookies,
  buildAdminSessionSnapshot,
  clearAdminCookieOptions,
  getAdminProfile
} from "@/lib/admin-auth";
import { getAdminRole } from "@/lib/admin-rbac";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeUserText } from "@/lib/admin-users";
import { createPublicClient } from "@/lib/supabase-public";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const { admin } = auth;

  return auth.finish(
    NextResponse.json({
      user: {
        id: admin.authUser.id,
        email: admin.authUser.email ?? "",
        fullName: safeUserText(admin.profile.full_name ?? admin.authUser.user_metadata?.full_name, 255),
        role: getAdminRole(admin)
      }
    })
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const password = safeUserText(body.password, 255);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid email or password." },
      { status: 401 }
    );
  }

  const profile = await getAdminProfile(data.user.id);

  if (!profile || profile.status !== "active") {
    return NextResponse.json(
      { error: "This account is not authorized for admin access." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName: safeUserText(profile.full_name ?? data.user.user_metadata?.full_name, 255)
    }
  });

  applyAdminSessionCookies(
    response,
    data.session.access_token,
    data.session.refresh_token,
    buildAdminSessionSnapshot(data.user, profile)
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  const options = clearAdminCookieOptions();

  response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
  response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);

  return response;
}
