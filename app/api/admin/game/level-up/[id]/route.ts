import { NextResponse } from "next/server";
import { GAME_LEVEL_NAMES, gameLevelUpRuleToClient, type GameLevelName } from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLevelName(value: unknown): GameLevelName {
  const levelName = safeText(value, 80);
  const normalizedLevelName = levelName === "Rank" ? "Levels" : levelName;
  return GAME_LEVEL_NAMES.includes(normalizedLevelName as GameLevelName) ? (normalizedLevelName as GameLevelName) : "Levels";
}

function safeCriteria(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const scoringRuleId = safeText(record.scoringRuleId, 80);
      const requiredCount = Math.max(1, safeInteger(record.requiredCount, 1));

      return scoringRuleId
        ? {
            scoringRuleId,
            requiredCount,
            notes: safeText(record.notes, 500)
          }
        : null;
    })
    .filter(Boolean);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    levelName?: unknown;
    sublevelName?: unknown;
    criteria?: unknown;
    isActive?: unknown;
  };
  const levelName = normalizeLevelName(body.levelName);
  const sublevelName = safeText(body.sublevelName, 160);

  if (!sublevelName) {
    return auth.finish(NextResponse.json({ error: "Sublevel is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_level_up_rules")
    .update({
      level_name: levelName,
      sublevel_name: sublevelName,
      criteria: safeCriteria(body.criteria),
      is_active: body.isActive !== false,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, level_name, sublevel_name, criteria, is_active, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to save level up rule." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ levelUpRule: gameLevelUpRuleToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_level_up_rules").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
