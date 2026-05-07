import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
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
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("pages")
            ? "Missing pages table. Run the new SQL schema update for the Builder pages feature first."
            : error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    pages: (data ?? []).map((row) => rowToBuilderPage(row))
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
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
    return NextResponse.json({ error: "Page title is required." }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Page slug is required." }, { status: 400 });
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
    return NextResponse.json(
      {
        error:
          error?.message.includes("pages")
            ? "Missing pages table. Run the new SQL schema update for the Builder pages feature first."
            : error?.message ?? "Failed to create page."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ page: rowToBuilderPage(data) }, { status: 201 });
}
