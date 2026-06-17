import { NextResponse } from "next/server";
import {
  gameInterstitialToClient,
  normalizeGameInterstitialStatus,
  normalizeGameInterstitialType
} from "@/lib/game-admin";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    name?: unknown;
    description?: unknown;
    interstitialType?: unknown;
    displayOrder?: unknown;
    status?: unknown;
    metadata?: unknown;
  };
  const name = safeText(body.name, 255);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Interstitial name is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_interstitials")
    .update({
      name,
      description: safeText(body.description, 2000),
      interstitial_type: normalizeGameInterstitialType(body.interstitialType),
      display_order: Math.max(1, safeInteger(body.displayOrder, 1)),
      status: normalizeGameInterstitialStatus(body.status),
      metadata: safeMetadata(body.metadata),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, name, description, interstitial_type, display_order, status, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json({ error: error?.message ?? "Failed to save interstitial." }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ interstitial: gameInterstitialToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_interstitials").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
