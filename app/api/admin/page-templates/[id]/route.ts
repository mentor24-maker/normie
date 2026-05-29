import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeEmailFunction } from "@/lib/builder-email-template";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  normalizeTemplateKind,
  rowToBuilderTemplate,
  safeText,
  serializeBuilderDocument
} from "@/lib/builder-template";

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
    templateKind?: string;
    emailFunction?: string;
    pageBackground?: unknown;
    layoutSections?: unknown;
  };

  const name = safeText(body.name, 255);
  const templateKind = normalizeTemplateKind(body.templateKind);
  const emailFunction = normalizeEmailFunction(body.emailFunction);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Template name is required." }, { status: 400 }));
  }

  if (templateKind === "email" && !emailFunction) {
    return auth.finish(NextResponse.json({ error: "Select a Function for email templates." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("page_templates")
    .update({
      name,
      template_kind: templateKind,
      email_function: templateKind === "email" ? emailFunction : null,
      layout_sections: serializeBuilderDocument(body),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, name, template_kind, email_function, layout_sections, created_at, updated_at")
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
