import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { gameLevelTierToClient } from "@/lib/game-admin";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safePerks(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => safeText(item, 180)).filter(Boolean);
  }

  return safeText(value, 1000)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    level?: unknown;
    tier?: unknown;
    name?: unknown;
    pointsRequired?: unknown;
    sortOrder?: unknown;
    perks?: unknown;
  };

  const level = Math.max(1, safeInteger(body.level, 1));
  const tier = safeText(body.tier, 80);
  const name = safeText(body.name, 160);

  if (!tier) {
    return auth.finish(NextResponse.json({ error: "Tier is required." }, { status: 400 }));
  }

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_level_tiers")
    .update({
      level,
      tier,
      name,
      points_required: Math.max(0, safeInteger(body.pointsRequired, 0)),
      sort_order: safeInteger(body.sortOrder, level * 10),
      perks: safePerks(body.perks),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, level, tier, name, points_required, sort_order, perks, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json({ error: error?.message ?? "Failed to save level tier." }, { status: 500 })
    );
  }

  return auth.finish(NextResponse.json({ levelTier: gameLevelTierToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_level_tiers").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}

