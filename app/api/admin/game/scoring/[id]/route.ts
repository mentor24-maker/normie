import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { gameScoringRuleToClient } from "@/lib/game-admin";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    scoreName?: unknown;
    description?: unknown;
    specificCriteria?: unknown;
    points?: unknown;
  };
  const scoreName = safeText(body.scoreName, 160);

  if (!scoreName) {
    return auth.finish(NextResponse.json({ error: "Score name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_scoring")
    .update({
      score_name: scoreName,
      description: safeText(body.description, 1200),
      specific_criteria: safeText(body.specificCriteria, 2000),
      points: Math.max(0, safeInteger(body.points, 0)),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, score_name, description, specific_criteria, points, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json({ error: error?.message ?? "Failed to save scoring rule." }, { status: 500 })
    );
  }

  return auth.finish(NextResponse.json({ scoringRule: gameScoringRuleToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_scoring").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}

