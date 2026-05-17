import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeBuilderSection, rowToBuilderSavedSection, safeText } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { name?: unknown; section?: unknown };
  const name = safeText(body.name, 255);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Saved section name is required." }, { status: 400 }));
  }

  const updatePayload: { name: string; updated_at: string; section?: unknown } = {
    name,
    updated_at: new Date().toISOString()
  };

  if (body.section !== undefined) {
    const section = normalizeBuilderSection(body.section);

    if (!section) {
      return auth.finish(NextResponse.json({ error: "Saved section is invalid." }, { status: 400 }));
    }

    updatePayload.section = section;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_saved_sections")
    .update(updatePayload)
    .eq("id", id)
    .select("id, name, section, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      { error: error?.message ?? "Failed to update saved section." },
      { status: 500 }
    ));
  }

  const savedSection = rowToBuilderSavedSection(data);

  if (!savedSection) {
    return auth.finish(NextResponse.json({ error: "Failed to normalize saved section." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ savedSection }));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("builder_saved_sections").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
