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

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("page_templates")
    .select("id, name, template_kind, email_function, layout_sections, created_at, updated_at")
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
    .insert({
      name,
      template_kind: templateKind,
      email_function: templateKind === "email" ? emailFunction : null,
      layout_sections: serializeBuilderDocument(body)
    })
    .select("id, name, template_kind, email_function, layout_sections, created_at, updated_at")
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
