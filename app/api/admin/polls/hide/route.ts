import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as { pollIds?: string[] };
  const pollIds = (body.pollIds ?? []).map((id) => id.trim()).filter(Boolean);

  if (pollIds.length === 0) {
    return auth.finish(NextResponse.json({ error: "At least one poll id is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .update({ is_hidden: true })
    .in("id", pollIds)
    .select("id");

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(
    NextResponse.json({
      ok: true,
      hiddenCount: data?.length ?? pollIds.length
    })
  );
}
