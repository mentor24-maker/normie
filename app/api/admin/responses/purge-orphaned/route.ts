import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type PurgeOrphanedResponse = {
  deletedCount: number;
};

export async function POST() {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("purge_orphan_poll_responses");

  if (error) {
    const message = error.message.includes("purge_orphan_poll_responses")
      ? "Poll response cleanup is not installed yet. Apply migration 025_rename_responses_to_poll_response.sql."
      : error.message;

    return auth.finish(NextResponse.json({ error: message }, { status: 500 }));
  }

  const deletedCount = typeof data === "number" ? data : Number(data ?? 0);

  return auth.finish(
    NextResponse.json({
      ok: true,
      deletedCount: Number.isFinite(deletedCount) ? deletedCount : 0
    } satisfies PurgeOrphanedResponse & { ok: true })
  );
}
