import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  buildReminderSaveFields,
  GAME_REMINDER_DISPLAY_TYPES,
  gameReminderToClient,
  type GameReminderDisplayType
} from "@/lib/game-reminder";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";
import { createAdminClient } from "@/lib/supabase-admin";

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDisplayType(value: unknown): GameReminderDisplayType {
  const displayType = safeText(value, 32);
  return GAME_REMINDER_DISPLAY_TYPES.includes(displayType as GameReminderDisplayType)
    ? (displayType as GameReminderDisplayType)
    : "popup";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: unknown;
    displayType?: unknown;
    messageHtml?: unknown;
    criteriaLogic?: unknown;
    criteria?: unknown;
    criterionType?: unknown;
    criterionValue?: unknown;
    isActive?: unknown;
    sortOrder?: unknown;
    metadata?: unknown;
  };
  const name = safeText(body.name, 160);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Reminder name is required." }, { status: 400 }));
  }

  const saveFields = buildReminderSaveFields({
    criteriaLogic: body.criteriaLogic,
    criteria: body.criteria,
    criterionType: body.criterionType,
    criterionValue: body.criterionValue,
    existingMetadata: body.metadata
  });

  if (saveFields.error) {
    return auth.finish(NextResponse.json({ error: saveFields.error }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_reminders")
    .update({
      name,
      display_type: normalizeDisplayType(body.displayType),
      message_html: sanitizeRichTextHtml(String(body.messageHtml ?? "")),
      criterion_type: saveFields.criterionType,
      criterion_value: saveFields.criterionValue,
      metadata: saveFields.metadata,
      is_active: body.isActive !== false,
      sort_order: Math.max(0, safeInteger(body.sortOrder, 0)),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(
      "id, name, display_type, message_html, criterion_type, criterion_value, is_active, sort_order, metadata, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json({ error: error?.message ?? "Failed to save reminder." }, { status: 500 })
    );
  }

  return auth.finish(NextResponse.json({ reminder: gameReminderToClient(data) }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("game_reminders").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
