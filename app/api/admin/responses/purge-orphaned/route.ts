import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type PurgeOrphanedResponse = {
  deletedResponseCount: number;
  deletedReactionCount: number;
};

export async function POST() {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const [{ data: responseData, error: responseError }, { data: reactionData, error: reactionError }] =
    await Promise.all([
      supabase.rpc("purge_orphan_poll_responses"),
      supabase.rpc("purge_orphan_poll_reactions")
    ]);

  if (responseError) {
    const message = responseError.message.includes("purge_orphan_poll_responses")
      ? "Poll response cleanup is not installed yet. Apply migration 053_poll_orphan_player_records.sql."
      : responseError.message;

    return auth.finish(NextResponse.json({ error: message }, { status: 500 }));
  }

  if (reactionError && !reactionError.message.includes("purge_orphan_poll_reactions")) {
    return auth.finish(NextResponse.json({ error: reactionError.message }, { status: 500 }));
  }

  const deletedResponseCount = typeof responseData === "number" ? responseData : Number(responseData ?? 0);
  const deletedReactionCount =
    reactionError && reactionError.message.includes("purge_orphan_poll_reactions")
      ? 0
      : typeof reactionData === "number"
        ? reactionData
        : Number(reactionData ?? 0);

  return auth.finish(
    NextResponse.json({
      ok: true,
      deletedCount: deletedResponseCount + deletedReactionCount,
      deletedResponseCount: Number.isFinite(deletedResponseCount) ? deletedResponseCount : 0,
      deletedReactionCount: Number.isFinite(deletedReactionCount) ? deletedReactionCount : 0
    } satisfies PurgeOrphanedResponse & { ok: true; deletedCount: number })
  );
}
