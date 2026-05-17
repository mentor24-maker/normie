import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  normalizeBuilderModules,
  rowToBuilderCellModule,
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
    .from("builder_cell_modules")
    .select("id, name, modules, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return auth.finish(NextResponse.json(
      {
        error: error.message.includes("builder_cell_modules")
          ? "Missing builder_cell_modules table. Run the updated Supabase schema."
          : error.message
      },
      { status: 500 }
    ));
  }

  return auth.finish(
    NextResponse.json({
      cellModules: (data ?? []).map((row) => rowToBuilderCellModule(row))
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
    modules?: unknown;
  };
  const name = safeText(body.name, 255);
  const modules = normalizeBuilderModules(body.modules);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Saved module name is required." }, { status: 400 }));
  }

  if (modules.length === 0) {
    return auth.finish(NextResponse.json({ error: "Cell has no modules to save." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_cell_modules")
    .insert({
      name,
      modules,
      updated_at: new Date().toISOString()
    })
    .select("id, name, modules, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      {
        error: error?.message.includes("builder_cell_modules")
          ? "Missing builder_cell_modules table. Run the updated Supabase schema."
          : error?.message ?? "Failed to save cell module."
      },
      { status: 500 }
    ));
  }

  return auth.finish(NextResponse.json({ cellModule: rowToBuilderCellModule(data) }, { status: 201 }));
}
