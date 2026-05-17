import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  rowToBuilderPage,
  safeText,
  serializeBuilderDocument
} from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

function normalizeSlug(value: unknown) {
  return safeText(value, 255)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    slug?: string;
    templateId?: string;
    pageBackground?: unknown;
    layoutSections?: unknown;
    isPublished?: boolean;
  };

  const name = safeText(body.name, 255);
  const slug = normalizeSlug(body.slug);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Page title is required." }, { status: 400 }));
  }

  if (!slug) {
    return auth.finish(NextResponse.json({ error: "Page slug is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .update({
      name,
      slug,
      template_id: safeText(body.templateId, 120) || null,
      layout_sections: serializeBuilderDocument(body),
      is_published: body.isPublished ?? true,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to update page." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ page: rowToBuilderPage(data) }));
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
  const { error } = await supabase.from("pages").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
