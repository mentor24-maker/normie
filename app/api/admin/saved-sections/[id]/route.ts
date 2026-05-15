import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { rowToBuilderSavedSection, safeText } from "@/lib/builder-template";
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
  const body = (await request.json()) as { name?: unknown };
  const name = safeText(body.name, 255);

  if (!name) {
    return NextResponse.json({ error: "Saved section name is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_saved_sections")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, section, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update saved section." },
      { status: 500 }
    );
  }

  const savedSection = rowToBuilderSavedSection(data);

  if (!savedSection) {
    return NextResponse.json({ error: "Failed to normalize saved section." }, { status: 500 });
  }

  return NextResponse.json({ savedSection });
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
  const { error } = await supabase.from("builder_saved_sections").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
