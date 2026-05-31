import { NextResponse } from "next/server";
import { ACTIVE_GAME_LEVEL_EVENTS_SELECT, buildLevelEventsFromRows, type GameLevelEventRow } from "@/lib/game-level-events";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("game_level_events")
      .select(ACTIVE_GAME_LEVEL_EVENTS_SELECT)
      .eq("is_active", true);

    if (error) {
      if (error.message.includes("game_level_events")) {
        return NextResponse.json({ data: [] });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: buildLevelEventsFromRows((data ?? []) as unknown as GameLevelEventRow[])
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load game level events." },
      { status: 500 }
    );
  }
}
