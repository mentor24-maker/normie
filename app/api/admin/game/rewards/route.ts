import { NextResponse } from "next/server";
import { GAME_REWARD_STATUSES, GAME_REWARD_TYPES, gameRewardToClient, type GameRewardStatus, type GameRewardType } from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRewardType(value: unknown): GameRewardType {
  const rewardType = safeText(value, 80);
  return GAME_REWARD_TYPES.includes(rewardType as GameRewardType) ? (rewardType as GameRewardType) : "custom";
}

function normalizeRewardStatus(value: unknown): GameRewardStatus {
  const status = safeText(value, 80);
  return GAME_REWARD_STATUSES.includes(status as GameRewardStatus) ? (status as GameRewardStatus) : "draft";
}

function safeInventoryCount(value: unknown) {
  const text = safeText(value, 40);
  if (!text) {
    return null;
  }

  return Math.max(0, safeInteger(text, 0));
}

function safeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    name?: unknown;
    description?: unknown;
    rewardType?: unknown;
    pointsCost?: unknown;
    inventoryCount?: unknown;
    status?: unknown;
    imageUrl?: unknown;
    redemptionUrl?: unknown;
    metadata?: unknown;
  };
  const name = safeText(body.name, 160);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Reward name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_rewards")
    .insert({
      name,
      description: safeText(body.description, 1200),
      reward_type: normalizeRewardType(body.rewardType),
      points_cost: Math.max(0, safeInteger(body.pointsCost, 0)),
      inventory_count: safeInventoryCount(body.inventoryCount),
      status: normalizeRewardStatus(body.status),
      image_url: safeText(body.imageUrl, 500),
      redemption_url: safeText(body.redemptionUrl, 500),
      metadata: safeMetadata(body.metadata),
      updated_at: new Date().toISOString()
    })
    .select(
      "id, name, description, reward_type, points_cost, inventory_count, status, image_url, redemption_url, metadata, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json(
        {
          error: error?.message.includes("game_rewards")
            ? "Missing game_rewards table. Apply migration 020_game_management.sql."
            : error?.message ?? "Failed to save reward."
        },
        { status: 500 }
      )
    );
  }

  return auth.finish(NextResponse.json({ reward: gameRewardToClient(data) }, { status: 201 }));
}
