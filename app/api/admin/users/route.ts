import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import {
  mergeAdminUserRecord,
  normalizeUserRole,
  normalizeUserStatus,
  safeUserText,
  type UserProfileRow
} from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

async function listUsersWithProfiles() {
  const supabase = createAdminClient();

  const [{ data: authData, error: authError }, { data: profileData, error: profileError }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase
        .from("users")
        .select("id, full_name, role, status, notes, created_at, updated_at")
        .order("created_at", { ascending: false })
    ]);

  if (authError) {
    throw new Error(authError.message);
  }

  if (profileError) {
    throw new Error(
      profileError.message.includes("users")
        ? "Missing users table. Run the updated Supabase schema before using User Management."
        : profileError.message
    );
  }

  const profilesById = new Map<string, UserProfileRow>(
    ((profileData ?? []) as UserProfileRow[]).map((profile) => [profile.id, profile])
  );

  return ((authData?.users ?? []) as User[])
    .map((user) => mergeAdminUserRecord(user, profilesById.get(user.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function GET() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  try {
    const users = await listUsersWithProfiles();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load users." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    role?: unknown;
    status?: unknown;
    notes?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const password = safeUserText(body.password, 255);
  const fullName = safeUserText(body.fullName, 255);
  const role = normalizeUserRole(body.role);
  const status = normalizeUserStatus(body.status);
  const notes = safeUserText(body.notes, 4000);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
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

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user." },
      { status: 500 }
    );
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id: createdUser.user.id,
    full_name: fullName,
    role,
    status,
    notes,
    updated_at: new Date().toISOString()
  });

  if (profileError) {
    return NextResponse.json(
      {
        error: profileError.message.includes("users")
          ? "User was created in Auth, but the users table is missing. Run the updated Supabase schema."
          : profileError.message
      },
      { status: 500 }
    );
  }

  const createdRecord = mergeAdminUserRecord(createdUser.user, {
    id: createdUser.user.id,
    full_name: fullName,
    role,
    status,
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return NextResponse.json({ user: createdRecord }, { status: 201 });
}
