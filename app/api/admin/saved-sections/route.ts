import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  normalizeBuilderSection,
  rowToBuilderSavedSection,
  safeText
} from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_saved_sections")
    .select("id, name, section, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return auth.finish(NextResponse.json(
      {
        error: error.message.includes("builder_saved_sections")
          ? "Missing builder_saved_sections table. Run the updated Supabase schema."
          : error.message
      },
      { status: 500 }
    ));
  }

  return auth.finish(
    NextResponse.json({
      savedSections: (data ?? [])
        .map((row) => rowToBuilderSavedSection(row))
        .filter((section): section is NonNullable<typeof section> => Boolean(section))
    })
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    name?: unknown;
    section?: unknown;
  };
  const name = safeText(body.name, 255);
  const section = normalizeBuilderSection(body.section);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Saved section name is required." }, { status: 400 }));
  }

  if (!section) {
    return auth.finish(NextResponse.json({ error: "Saved section content is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_saved_sections")
    .insert({
      name,
      section,
      updated_at: new Date().toISOString()
    })
    .select("id, name, section, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      {
        error: error?.message.includes("builder_saved_sections")
          ? "Missing builder_saved_sections table. Run the updated Supabase schema."
          : error?.message ?? "Failed to save section."
      },
      { status: 500 }
    ));
  }

  const savedSection = rowToBuilderSavedSection(data);

  if (!savedSection) {
    return auth.finish(NextResponse.json({ error: "Failed to normalize saved section." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ savedSection }, { status: 201 }));
}
