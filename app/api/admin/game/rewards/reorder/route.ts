import { NextResponse } from "next/server";
import { gameRewardToClient } from "@/lib/game-admin";
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
    rewards?: Array<{ id?: unknown; rewardOrder?: unknown }>;
  };

  const rewards = Array.isArray(body.rewards)
    ? body.rewards
        .map((reward, index) => ({
          id: String(reward.id ?? "").trim(),
          rewardOrder: Math.max(1, safeInteger(reward.rewardOrder, index + 1))
        }))
        .filter((reward) => reward.id)
    : [];

  if (rewards.length === 0) {
    return auth.finish(NextResponse.json({ error: "No rewards were provided for reordering." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const updatedAt = new Date().toISOString();
  const updateResults = await Promise.all(
    rewards.map((reward) =>
      supabase
        .from("game_rewards")
        .update({ reward_order: reward.rewardOrder, updated_at: updatedAt })
        .eq("id", reward.id)
    )
  );
  const failedUpdate = updateResults.find((result) => result.error);

  if (failedUpdate?.error) {
    return auth.finish(NextResponse.json({ error: failedUpdate.error.message }, { status: 500 }));
  }

  const { data, error } = await supabase
    .from("game_rewards")
    .select(
      "id, name, description, reward_type, reward_order, points_cost, inventory_count, status, image_url, redemption_url, metadata, created_at, updated_at"
    )
    .order("reward_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to reload rewards." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ rewards: data.map(gameRewardToClient) }));
}
