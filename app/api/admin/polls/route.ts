import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, category, question, image_url, order_index, created_at, is_published, poll_options(id, label, sort_order)")
    .order("order_index", { ascending: true });

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  const polls = (data ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }));

  return auth.finish(NextResponse.json({ polls }));
}

export async function DELETE(request: Request) {
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
  const { error } = await supabase.from("polls").delete().in("id", pollIds);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true, deletedCount: pollIds.length }));
}
