import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeBuilderModules, rowToBuilderCellModule, safeText } from "@/lib/builder-template";
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
  const body = (await request.json()) as { name?: unknown; moduleClass?: unknown; modules?: unknown };
  const name = safeText(body.name, 255);
  const moduleClass = safeText(body.moduleClass, 255);
  const modules = body.modules === undefined ? undefined : normalizeBuilderModules(body.modules);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Saved module name is required." }, { status: 400 }));
  }

  if (body.modules !== undefined && (!modules || modules.length === 0)) {
    return auth.finish(NextResponse.json({ error: "Saved module must contain at least one module." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const updates: { name: string; module_class: string; modules?: ReturnType<typeof normalizeBuilderModules>; updated_at: string } = {
    name,
    module_class: moduleClass,
    updated_at: new Date().toISOString()
  };

  if (modules) {
    updates.modules = modules;
  }

  const { data, error } = await supabase
    .from("builder_cell_modules")
    .update(updates)
    .eq("id", id)
    .select("id, name, module_class, modules, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      { error: error?.message ?? "Failed to update saved module." },
      { status: 500 }
    ));
  }

  return auth.finish(NextResponse.json({ cellModule: rowToBuilderCellModule(data) }));
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
  const { error } = await supabase.from("builder_cell_modules").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
