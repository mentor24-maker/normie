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

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return auth.finish(NextResponse.json(
      {
        error:
          error.message.includes("pages")
            ? "Missing pages table. Run the new SQL schema update for the Builder pages feature first."
            : error.message
      },
      { status: 500 }
    ));
  }

  return auth.finish(
    NextResponse.json({
      pages: (data ?? []).map((row) => rowToBuilderPage(row))
    })
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

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
    .insert({
      name,
      slug,
      template_id: safeText(body.templateId, 120) || null,
      layout_sections: serializeBuilderDocument(body),
      is_published: body.isPublished ?? true
    })
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      {
        error:
          error?.message.includes("pages")
            ? "Missing pages table. Run the new SQL schema update for the Builder pages feature first."
            : error?.message ?? "Failed to create page."
      },
      { status: 500 }
    ));
  }

  return auth.finish(NextResponse.json({ page: rowToBuilderPage(data) }, { status: 201 }));
}
