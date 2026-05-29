import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  GAME_REMINDER_CRITERION_TYPES,
  GAME_REMINDER_DISPLAY_TYPES,
  gameReminderToClient,
  parseReminderCriterionValueInput,
  type GameReminderCriterionType,
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

function normalizeCriterionType(value: unknown): GameReminderCriterionType {
  const criterionType = safeText(value, 64);
  return GAME_REMINDER_CRITERION_TYPES.includes(criterionType as GameReminderCriterionType)
    ? (criterionType as GameReminderCriterionType)
    : "polls_taken";
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    name?: unknown;
    displayType?: unknown;
    messageHtml?: unknown;
    criterionType?: unknown;
    criterionValue?: unknown;
    isActive?: unknown;
    sortOrder?: unknown;
  };
  const name = safeText(body.name, 160);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Reminder name is required." }, { status: 400 }));
  }

  const criterionType = normalizeCriterionType(body.criterionType);
  const criterionValue = parseReminderCriterionValueInput(criterionType, body.criterionValue);

  if (criterionType === "specific_poll" && !("pollId" in criterionValue && criterionValue.pollId)) {
    return auth.finish(NextResponse.json({ error: "Select a poll for this reminder." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_reminders")
    .insert({
      name,
      display_type: normalizeDisplayType(body.displayType),
      message_html: sanitizeRichTextHtml(String(body.messageHtml ?? "")),
      criterion_type: criterionType,
      criterion_value: criterionValue,
      is_active: body.isActive !== false,
      sort_order: Math.max(0, safeInteger(body.sortOrder, 0)),
      updated_at: new Date().toISOString()
    })
    .select(
      "id, name, display_type, message_html, criterion_type, criterion_value, is_active, sort_order, metadata, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return auth.finish(
      NextResponse.json(
        {
          error: error?.message.includes("game_reminders")
            ? "Missing game_reminders table. Apply migration 037_game_reminders.sql."
            : error?.message ?? "Failed to save reminder."
        },
        { status: 500 }
      )
    );
  }

  return auth.finish(NextResponse.json({ reminder: gameReminderToClient(data) }, { status: 201 }));
}
