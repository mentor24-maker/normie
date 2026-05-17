import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { rowToBuilderTemplate, safeText, serializeBuilderDocument } from "@/lib/builder-template";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    pageBackground?: unknown;
    layoutSections?: unknown;
  };

  const name = safeText(body.name, 255);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Template name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("page_templates")
    .update({
      name,
      template_kind: "modular",
      layout_sections: serializeBuilderDocument(body),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, name, template_kind, layout_sections, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to update page template." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ pageTemplate: rowToBuilderTemplate(data) }));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("page_templates").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
