import { NextResponse } from "next/server";
import { gameLevelToClient } from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    levels?: Array<{ id?: unknown; levelOrder?: unknown }>;
  };

  const levels = Array.isArray(body.levels)
    ? body.levels
        .map((level, index) => ({
          id: String(level.id ?? "").trim(),
          levelOrder: Math.min(10, Math.max(1, safeInteger(level.levelOrder, index + 1)))
        }))
        .filter((level) => level.id)
    : [];

  if (levels.length === 0) {
    return auth.finish(NextResponse.json({ error: "No game levels were provided for reordering." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const updatedAt = new Date().toISOString();

  const updateResults = await Promise.all(
    levels.map((level) =>
      supabase
        .from("game_levels")
        .update({ level_order: level.levelOrder, updated_at: updatedAt })
        .eq("id", level.id)
    )
  );
  const failedUpdate = updateResults.find((result) => result.error);

  if (failedUpdate?.error) {
    return auth.finish(
      NextResponse.json(
        {
          error: failedUpdate.error.message.includes("game_levels_level_order_key")
            ? "Apply migration 023_game_level_tiers_option.sql before reordering game levels."
            : failedUpdate.error.message.includes("game_levels_level_name_check")
              ? "Apply migration 028_game_level_levels_option.sql before reordering progression tracks. The database still has the old Rank constraint."
            : failedUpdate.error.message
        },
        { status: 500 }
      )
    );
  }

  const { data, error } = await supabase
    .from("game_levels")
    .select("id, level_name, level_order, game_level_levels, metadata, created_at, updated_at")
    .order("level_order", { ascending: true });

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to reload game levels." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ gameLevels: data.map(gameLevelToClient) }));
}
