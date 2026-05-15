import { NextResponse } from "next/server";
import { applyAdminSessionCookies, buildAdminSessionSnapshot } from "@/lib/admin-auth";
import { safeUserText } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const password = safeUserText(body.password, 255);
  const fullName = safeUserText(body.fullName, 255);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { count, error: countError } = await adminClient
    .from("team_users")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json(
      {
        error: countError.message.includes("users")
          ? "Missing team_users table. Run the updated Supabase schema before registering an admin."
          : countError.message
      },
      { status: 500 }
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Public admin registration is disabled after the first admin account is created." },
      { status: 403 }
    );
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    },
    app_metadata: {
      role: "owner"
    }
  });

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create admin account." },
      { status: 500 }
    );
  }

  const { error: profileError } = await adminClient.from("team_users").upsert({
    id: createdUser.user.id,
    full_name: fullName,
    role: "owner",
    status: "active",
    notes: "Bootstrap admin account",
    updated_at: new Date().toISOString()
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const publicClient = createPublicClient();
  const { data: sessionData, error: sessionError } = await publicClient.auth.signInWithPassword({
    email,
    password
  });

  if (sessionError || !sessionData.session) {
    return NextResponse.json(
      { error: sessionError?.message ?? "Admin account created, but automatic sign-in failed." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: createdUser.user.id,
      email,
      fullName
    }
  });

  applyAdminSessionCookies(
    response,
    sessionData.session.access_token,
    sessionData.session.refresh_token,
    buildAdminSessionSnapshot(createdUser.user, {
      id: createdUser.user.id,
      full_name: fullName,
      role: "owner",
      status: "active",
      notes: "Bootstrap admin account",
      created_at: null,
      updated_at: new Date().toISOString()
    })
  );

  return response;
}
