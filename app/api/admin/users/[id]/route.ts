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
  normalizeUserRole,
  normalizeUserStatus,
  safeUserText
} from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

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
      { error: updateError?.message ?? "Failed to update user." },
      { status: 500 }
    );
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id,
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
          ? "User auth was updated, but the users table is missing. Run the updated Supabase schema."
          : profileError.message
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });

  if (admin.authUser.id === id) {
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
        updated_at: new Date().toISOString()
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  await supabase.from("users").delete().eq("id", id);

  const response = NextResponse.json({ ok: true });

  if (admin.authUser.id === id) {
    const options = clearAdminCookieOptions();
    response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
    response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
    response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);
  }

  return response;
}
