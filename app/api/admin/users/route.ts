import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { safeUserText } from "@/lib/admin-users";
import {
  buildPublicUserFullName,
  mergePublicUserRecord,
  normalizePublicUserStatus,
  type PublicUserRow
} from "@/lib/public-users";
import { createAdminClient } from "@/lib/supabase-admin";

async function authorizeAdmin() {
  const cookieStore = await cookies();
  return getAuthorizedAdminFromCookieStore(cookieStore);
}

export async function GET() {
  const admin = await authorizeAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, full_name, email, phone, status, source, notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("users")
          ? "Missing users table. Run the updated public users schema."
          : error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: ((data ?? []) as PublicUserRow[]).map(mergePublicUserRecord) });
}

export async function POST(request: Request) {
  const admin = await authorizeAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

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
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      status,
      source,
      notes,
      updated_at: timestamp
    })
    .select("id, first_name, last_name, full_name, email, phone, status, source, notes, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create user." },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: mergePublicUserRecord(data as PublicUserRow) }, { status: 201 });
}
