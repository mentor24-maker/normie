import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { rowToBuilderTemplate, safeText, serializeBuilderDocument } from "@/lib/builder-template";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("page_templates")
    .select("id, name, template_kind, layout_sections, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return auth.finish(NextResponse.json(
      {
        error:
          error.message.includes("page_templates")
            ? "Missing page_templates table. Run the new SQL schema update for the page builder first."
            : error.message
      },
      { status: 500 }
    ));
  }

  return auth.finish(
    NextResponse.json({
      pageTemplates: (data ?? []).map((row) => rowToBuilderTemplate(row))
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
    .insert({
      name,
      template_kind: "modular",
      layout_sections: serializeBuilderDocument(body)
    })
    .select("id, name, template_kind, layout_sections, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      {
        error:
          error?.message.includes("page_templates")
            ? "Missing page_templates table. Run the new SQL schema update for the page builder first."
            : error?.message ?? "Failed to create page template."
      },
      { status: 500 }
    ));
  }

  return auth.finish(NextResponse.json({ pageTemplate: rowToBuilderTemplate(data) }, { status: 201 }));
}
