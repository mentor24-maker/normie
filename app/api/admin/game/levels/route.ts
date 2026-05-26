import { NextResponse } from "next/server";
import { GAME_LEVEL_NAMES, gameLevelToClient, type GameLevelName } from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeLevelName(value: unknown): GameLevelName {
  const levelName = safeText(value, 80);
  const normalizedLevelName = levelName === "Rank" ? "Levels" : levelName;
  return GAME_LEVEL_NAMES.includes(normalizedLevelName as GameLevelName) ? (normalizedLevelName as GameLevelName) : "Levels";
}

function safeSublevels(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = item as Record<string, unknown>;
          const name = safeText(record.name, 120);
          const order = Math.min(1000, Math.max(1, safeInteger(record.order, index + 1)));
          return name
            ? {
                name,
                order,
                backgroundColor: safeText(record.backgroundColor, 20),
                color: safeText(record.color, 20),
                pollReward: safeRecord(record.pollReward),
                style: safeRecord(record.style),
                trackReward: safeRecord(record.trackReward)
              }
            : null;
        }

        const name = safeText(item, 120);
        return name ? { name, order: index + 1 } : null;
      })
      .filter(Boolean);
  }

  return safeText(value, 2000)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name, index) => ({ name, order: index + 1 }));
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    levelName?: unknown;
    levelOrder?: unknown;
    sublevels?: unknown;
    gameLevelLevels?: unknown;
  };
  const levelName = normalizeLevelName(body.levelName);
  const levelOrder = Math.min(10, Math.max(1, safeInteger(body.levelOrder, 1)));

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_levels")
    .insert({
      level_name: levelName,
      level_order: levelOrder,
      game_level_levels: safeSublevels(body.sublevels ?? body.gameLevelLevels),
      updated_at: new Date().toISOString()
    })
    .select("id, level_name, level_order, game_level_levels, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json(
        {
          error: error?.message.includes("game_levels")
            ? "Missing game_levels table. Apply migration 022_game_levels.sql."
            : error?.message ?? "Failed to save game level."
        },
        { status: 500 }
      )
    );
  }

  return auth.finish(NextResponse.json({ gameLevel: gameLevelToClient(data) }, { status: 201 }));
}
