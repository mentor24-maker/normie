import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function isAuthorized(request: Request) {
  const adminKey = request.headers.get("x-import-admin-key");
  return Boolean(process.env.IMPORT_ADMIN_KEY && adminKey === process.env.IMPORT_ADMIN_KEY);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, category, question, order_index, created_at, is_published, poll_options(id, label, sort_order)")
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const polls = (data ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }));

  return NextResponse.json({ polls });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const body = (await request.json()) as { pollIds?: string[] };
  const pollIds = (body.pollIds ?? []).map((id) => id.trim()).filter(Boolean);

  if (pollIds.length === 0) {
    return NextResponse.json({ error: "At least one poll id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("polls").delete().in("id", pollIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedCount: pollIds.length });
}
