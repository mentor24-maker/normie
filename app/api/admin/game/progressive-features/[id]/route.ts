import { NextResponse } from "next/server";
import { GAME_LEVEL_NAMES, gameProgressiveFeatureToClient, type GameLevelName } from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeLevelName(value: unknown): GameLevelName {
  const levelName = safeText(value, 80);
  const normalizedLevelName = (
    {
      Rank: "Level",
      Levels: "Level",
      Grades: "Grade",
      Classes: "Class",
      Degrees: "Degree",
      Echelons: "Echelon",
      Tiers: "Tier"
    } as const
  )[levelName as "Rank" | "Levels" | "Grades" | "Classes" | "Degrees" | "Echelons" | "Tiers"] ?? levelName;
  return GAME_LEVEL_NAMES.includes(normalizedLevelName as GameLevelName) ? (normalizedLevelName as GameLevelName) : "Level";
}

function normalizeFeatureKey(value: unknown) {
  return safeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    featureKey?: unknown;
    name?: unknown;
    description?: unknown;
    unlockLevelName?: unknown;
    unlockSublevelName?: unknown;
    isActive?: unknown;
    metadata?: unknown;
  };
  const name = safeText(body.name, 255);
  const featureKey = normalizeFeatureKey(body.featureKey || name);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Feature name is required." }, { status: 400 }));
  }

  if (!featureKey) {
    return auth.finish(NextResponse.json({ error: "Feature key is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_progressive_features")
    .update({
      feature_key: featureKey,
      name,
      description: safeText(body.description, 2000),
      unlock_level_name: normalizeLevelName(body.unlockLevelName),
      unlock_sublevel_name: safeText(body.unlockSublevelName, 160),
      is_active: body.isActive !== false,
      metadata: safeMetadata(body.metadata),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, feature_key, name, description, unlock_level_name, unlock_sublevel_name, is_active, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to save progressive feature." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ progressiveFeature: gameProgressiveFeatureToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_progressive_features").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
