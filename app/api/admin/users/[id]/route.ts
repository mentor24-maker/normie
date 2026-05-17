import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeUserText } from "@/lib/admin-users";
import {
  buildPublicUserFullName,
  mergePublicUserRecord,
  normalizePublicUserStatus,
  type PublicUserRow
} from "@/lib/public-users";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("users:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    fullName?: unknown;
    phone?: unknown;
    status?: unknown;
    source?: unknown;
    notes?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const firstName = safeUserText(body.firstName, 120);
  const lastName = safeUserText(body.lastName, 120);
  const fullName = safeUserText(body.fullName, 255) || buildPublicUserFullName(firstName, lastName);
  const phone = safeUserText(body.phone, 80);
  const status = normalizePublicUserStatus(body.status);
  const source = safeUserText(body.source, 120) || "manual";
  const notes = safeUserText(body.notes, 4000);

  if (!email || !email.includes("@")) {
    return auth.finish(NextResponse.json({ error: "A valid email is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .update({
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      status,
      source,
      notes,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, first_name, last_name, full_name, email, phone, status, source, notes, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json({ error: error?.message ?? "Failed to update user." }, { status: 500 })
    );
  }

  return auth.finish(NextResponse.json({ user: mergePublicUserRecord(data as PublicUserRow) }));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("users:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
