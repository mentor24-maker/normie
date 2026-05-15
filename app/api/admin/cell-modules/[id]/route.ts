import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { normalizeBuilderModules, rowToBuilderCellModule, safeText } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { name?: unknown; modules?: unknown };
  const name = safeText(body.name, 255);
  const modules = body.modules === undefined ? undefined : normalizeBuilderModules(body.modules);

  if (!name) {
    return NextResponse.json({ error: "Saved module name is required." }, { status: 400 });
  }

  if (body.modules !== undefined && (!modules || modules.length === 0)) {
    return NextResponse.json({ error: "Saved module must contain at least one module." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const updates: { name: string; modules?: ReturnType<typeof normalizeBuilderModules>; updated_at: string } = {
    name,
    updated_at: new Date().toISOString()
  };

  if (modules) {
    updates.modules = modules;
  }

  const { data, error } = await supabase
    .from("builder_cell_modules")
    .update(updates)
    .eq("id", id)
    .select("id, name, modules, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update saved module." },
      { status: 500 }
    );
  }

  return NextResponse.json({ cellModule: rowToBuilderCellModule(data) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("builder_cell_modules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
