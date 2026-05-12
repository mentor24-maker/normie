import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import {
  normalizeBuilderModules,
  rowToBuilderCellModule,
  safeText
} from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("builder_cell_modules")
    .select("id, name, modules, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("builder_cell_modules")
          ? "Missing builder_cell_modules table. Run the updated Supabase schema."
          : error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    cellModules: (data ?? []).map((row) => rowToBuilderCellModule(row))
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: unknown;
    modules?: unknown;
  };
  const name = safeText(body.name, 255);
  const modules = normalizeBuilderModules(body.modules);

  if (!name) {
    return NextResponse.json({ error: "Saved module name is required." }, { status: 400 });
  }

  if (modules.length === 0) {
    return NextResponse.json({ error: "Cell has no modules to save." }, { status: 400 });
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
    return NextResponse.json(
      {
        error: error?.message.includes("builder_cell_modules")
          ? "Missing builder_cell_modules table. Run the updated Supabase schema."
          : error?.message ?? "Failed to save cell module."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ cellModule: rowToBuilderCellModule(data) }, { status: 201 });
}
