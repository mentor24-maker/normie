import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_PROFILE_COOKIE,
  ADMIN_REFRESH_COOKIE,
  applyAdminSessionCookies,
  buildAdminSessionSnapshot,
  clearAdminCookieOptions,
  getAuthorizedAdminFromCookieStore
} from "@/lib/admin-auth";
import {
  mergeAdminUserRecord,
  normalizeUserRole,
  normalizeUserStatus,
  safeUserText,
  type UserProfileRow
} from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

export type AdminDirectoryTable = "users" | "team_users";

function tableLabel(table: AdminDirectoryTable) {
  return table === "team_users" ? "team user" : "user";
}

async function authorizeAdmin() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return { cookieStore, admin: null };
  }

  return { cookieStore, admin };
}

async function listUsersWithProfiles(table: AdminDirectoryTable) {
  const supabase = createAdminClient();

  const [{ data: authData, error: authError }, { data: profileData, error: profileError }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase
        .from(table)
        .select("id, full_name, role, status, notes, created_at, updated_at")
        .order("created_at", { ascending: false })
    ]);

  if (authError) {
    throw new Error(authError.message);
  }

  if (profileError) {
    throw new Error(
      profileError.message.includes(table)
        ? `Missing ${table} table. Run the updated Supabase schema before using this directory.`
        : profileError.message
    );
  }

  const profilesById = new Map<string, UserProfileRow>(
    ((profileData ?? []) as UserProfileRow[]).map((profile) => [profile.id, profile])
  );

  return ((authData?.users ?? []) as User[])
    .map((user) => mergeAdminUserRecord(user, profilesById.get(user.id)))
    .filter((user) => profilesById.has(user.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDirectoryUsers(table: AdminDirectoryTable) {
  const { admin } = await authorizeAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  try {
    const users = await listUsersWithProfiles(table);
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load users." },
      { status: 500 }
    );
  }
}

export async function createDirectoryUser(request: Request, table: AdminDirectoryTable) {
  const { admin } = await authorizeAdmin();

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
      { error: createError?.message ?? `Failed to create ${tableLabel(table)}.` },
      { status: 500 }
    );
  }

  const timestamp = new Date().toISOString();
  const { error: profileError } = await supabase.from(table).upsert({
    id: createdUser.user.id,
    full_name: fullName,
    role,
    status,
    notes,
    updated_at: timestamp
  });

  if (profileError) {
    return NextResponse.json(
      {
        error: profileError.message.includes(table)
          ? `Auth user was created, but the ${table} table is missing. Run the updated Supabase schema.`
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
    created_at: timestamp,
    updated_at: timestamp
  });

  return NextResponse.json({ user: createdRecord }, { status: 201 });
}

export async function updateDirectoryUser(
  request: Request,
  context: { params: Promise<{ id: string }> },
  table: AdminDirectoryTable
) {
  const { cookieStore, admin } = await authorizeAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const { id } = await context.params;
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

  if (password && password.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const authUpdate: {
    email: string;
    password?: string;
    user_metadata: { full_name: string };
    app_metadata: { role: string };
  } = {
    email,
    user_metadata: { full_name: fullName },
    app_metadata: { role }
  };

  if (password) {
    authUpdate.password = password;
  }

  const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, authUpdate);

  if (updateError || !updatedUser.user) {
    return NextResponse.json(
      { error: updateError?.message ?? `Failed to update ${tableLabel(table)}.` },
      { status: 500 }
    );
  }

  const timestamp = new Date().toISOString();
  const { error: profileError } = await supabase.from(table).upsert({
    id,
    full_name: fullName,
    role,
    status,
    notes,
    updated_at: timestamp
  });

  if (profileError) {
    return NextResponse.json(
      {
        error: profileError.message.includes(table)
          ? `Auth user was updated, but the ${table} table is missing. Run the updated Supabase schema.`
          : profileError.message
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });

  if (table === "team_users" && admin.authUser.id === id) {
    applyAdminSessionCookies(
      response,
      cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "",
      cookieStore.get(ADMIN_REFRESH_COOKIE)?.value ?? "",
      buildAdminSessionSnapshot(updatedUser.user, {
        id,
        full_name: fullName,
        role,
        status,
        notes,
        created_at: null,
        updated_at: timestamp
      })
    );

    if (status !== "active") {
      const options = clearAdminCookieOptions();
      response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
      response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
      response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);
    }
  }

  return response;
}

export async function deleteDirectoryUser(
  _request: Request,
  context: { params: Promise<{ id: string }> },
  table: AdminDirectoryTable
) {
  const { admin } = await authorizeAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.from(table).delete().eq("id", id);

  const response = NextResponse.json({ ok: true });

  if (table === "team_users" && admin.authUser.id === id) {
    const options = clearAdminCookieOptions();
    response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
    response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
    response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);
  }

  return response;
}
