import { NextResponse } from "next/server";
import { applyAdminSessionCookies, buildAdminSessionSnapshot } from "@/lib/admin-auth";
import { safeUserText } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";
import { findInvitedTeamProfileByEmail } from "@/lib/team-invitations";

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

  const invitedProfile = (count ?? 0) > 0 ? await findInvitedTeamProfileByEmail(email) : null;

  if ((count ?? 0) > 0 && !invitedProfile) {
    return NextResponse.json(
      {
        error:
          "No pending invitation was found for that email. Use the exact address from your invite email, or ask an owner to resend the invite from Team."
      },
      { status: 403 }
    );
  }

  const role = invitedProfile?.profile.role ?? "owner";
  const notes = invitedProfile?.profile.notes ?? "Bootstrap admin account";
  const authUserId = invitedProfile?.authUser.id;
  const authResponse = authUserId
    ? await adminClient.auth.admin.updateUserById(authUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || invitedProfile.profile.full_name || ""
        },
        app_metadata: {
          role
        }
      })
    : await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        },
        app_metadata: {
          role
        }
      });

  if (authResponse.error || !authResponse.data.user) {
    return NextResponse.json(
      { error: authResponse.error?.message ?? "Failed to create admin account." },
      { status: 500 }
    );
  }

  const authUser = authResponse.data.user;
  const profileName = fullName || safeUserText(invitedProfile?.profile.full_name, 255);
  const { error: profileError } = await adminClient.from("team_users").upsert({
    id: authUser.id,
    full_name: profileName,
    role,
    status: "active",
    notes,
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
      id: authUser.id,
      email,
      fullName: profileName
    }
  });

  applyAdminSessionCookies(
    response,
    sessionData.session.access_token,
    sessionData.session.refresh_token,
    buildAdminSessionSnapshot(authUser, {
      id: authUser.id,
      full_name: profileName,
      role,
      status: "active",
      notes,
      created_at: null,
      updated_at: new Date().toISOString()
    })
  );

  return response;
}
