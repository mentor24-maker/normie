import { NextResponse } from "next/server";
import {
  applyPlayerSessionCookies,
  buildPlayerSessionSnapshot,
  isMissingPlayerSchemaError,
  normalizePlayerHandle,
  safePlayerText
} from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    handle?: unknown;
  };

  const email = safePlayerText(body.email, 255).toLowerCase();
  const password = safePlayerText(body.password, 255);
  const fullName = safePlayerText(body.fullName, 255);
  const handle = normalizePlayerHandle(body.handle, email);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: existingUsers, error: existingUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (existingUsersError) {
    return NextResponse.json({ error: existingUsersError.message }, { status: 500 });
  }

  const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email);

  if (existingUser) {
    const { error: profileError } = await adminClient.from("player_profiles").upsert(
      {
        id: existingUser.id,
        full_name: fullName || String(existingUser.user_metadata?.full_name ?? ""),
        handle: normalizePlayerHandle(handle || existingUser.user_metadata?.handle, email),
        status: "active"
      },
      { onConflict: "id" }
    );

    if (isMissingPlayerSchemaError(profileError)) {
      return NextResponse.json(
        { error: "Player Portal database tables are not installed yet. Apply supabase/player-portal.sql and try again." },
        { status: 503 }
      );
    }

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "That email already has an account. Use Login, or reset the password if needed." },
      { status: 409 }
    );
  }

  const publicClient = createPublicClient();
  const { data, error } = await publicClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, handle }
    }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Registration failed." }, { status: 400 });
  }

  const profile = {
    id: data.user.id,
    full_name: fullName,
    handle,
    status: "active"
  };

  const { data: profileRow, error: profileError } = await adminClient
    .from("player_profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id, full_name, handle, status, created_at, updated_at")
    .single();

  if (isMissingPlayerSchemaError(profileError)) {
    return NextResponse.json(
      { error: "Player Portal database tables are not installed yet. Apply supabase/player-portal.sql and try again." },
      { status: 503 }
    );
  }

  if (profileError || !profileRow) {
    return NextResponse.json(
      { error: profileError?.message ?? "Player profile could not be created." },
      { status: 500 }
    );
  }

  if (!data.session) {
    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email ?? "", fullName, handle },
      needsEmailConfirmation: true
    });
  }

  const response = NextResponse.json({
    user: { id: data.user.id, email: data.user.email ?? "", fullName, handle }
  });

  applyPlayerSessionCookies(
    response,
    data.session.access_token,
    data.session.refresh_token,
    buildPlayerSessionSnapshot(data.user, profileRow)
  );

  return response;
}
