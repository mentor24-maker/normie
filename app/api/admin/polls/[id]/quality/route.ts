import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
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
  const body = (await request.json()) as { quality?: unknown };
  const quality = Number.parseInt(String(body.quality ?? ""), 10);

  if (!Number.isFinite(quality) || quality < 1 || quality > 3) {
    return auth.finish(NextResponse.json({ error: "Quality must be 1, 2, or 3." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("polls").update({ quality }).eq("id", id).select("id").maybeSingle();

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  if (!data) {
    return auth.finish(NextResponse.json({ error: "Poll not found." }, { status: 404 }));
  }

  return auth.finish(NextResponse.json({ ok: true, quality }));
}
