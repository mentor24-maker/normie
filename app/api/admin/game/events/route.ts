import { NextResponse } from "next/server";
import { GAME_LEVEL_NAMES, gameLevelEventToClient, type GameLevelName } from "@/lib/game-admin";
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

function safeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    eventName?: unknown;
    levelName?: unknown;
    sublevelName?: unknown;
    moduleId?: unknown;
    trigger?: unknown;
    isActive?: unknown;
    metadata?: unknown;
  };
  const eventName = safeText(body.eventName, 255);

  if (!eventName) {
    return auth.finish(NextResponse.json({ error: "Event name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_level_events")
    .insert({
      event_name: eventName,
      level_name: normalizeLevelName(body.levelName),
      sublevel_name: safeText(body.sublevelName, 160),
      module_id: safeText(body.moduleId, 80) || null,
      trigger: "game",
      is_active: body.isActive !== false,
      metadata: safeMetadata(body.metadata),
      updated_at: new Date().toISOString()
    })
    .select("id, event_name, level_name, sublevel_name, module_id, trigger, is_active, metadata, created_at, updated_at, builder_cell_modules(name)")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to save event." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ levelEvent: gameLevelEventToClient(data) }, { status: 201 }));
}
