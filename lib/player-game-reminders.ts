import { evaluatePlayerReminders, explainReminderMatch, type PlayerMatchedReminder, type PlayerReminderContext } from "@/lib/game-reminder-eval";
import { formatReminderCriterionSummary, gameReminderToClient, type GameReminder } from "@/lib/game-reminder";
import type { AuthorizedPlayer } from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type GameReminderRow = {
  id: string;
  name: string;
  display_type: string | null;
  message_html: string | null;
  criterion_type: string | null;
  criterion_value: unknown;
  is_active: boolean | null;
  sort_order: number | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export type PlayerGameReminderBundle = {
  popupReminders: PlayerMatchedReminder[];
  inlineReminders: PlayerMatchedReminder[];
};

export type PlayerGameReminderDiagnosticReminder = {
  id: string;
  name: string;
  displayType: string;
  criterionSummary: string;
  matched: boolean;
  matchReason: string;
  queuedForDisplay: boolean;
  blockedByDismissal: boolean;
};

export type PlayerGameReminderDiagnostics = {
  loadedAt: string;
  playerId: string;
  loadError: string | null;
  activeReminderCount: number;
  context: {
    pollsTaken: number;
    loginCount: number;
    isRegistered: boolean;
    answeredPollIds: string[];
  };
  reminders: PlayerGameReminderDiagnosticReminder[];
  matchedPopupCount: number;
  matchedInlineCount: number;
  visiblePopupCount: number;
  visibleInlineCount: number;
};

export type PlayerGameReminderState = {
  bundle: PlayerGameReminderBundle;
  diagnostics: PlayerGameReminderDiagnostics;
};

async function loadActiveGameReminders(): Promise<{ reminders: GameReminder[]; loadError: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_reminders")
    .select(
      "id, name, display_type, message_html, criterion_type, criterion_value, is_active, sort_order, metadata, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.message.includes("game_reminders")) {
      return { reminders: [], loadError: "Missing game_reminders table. Apply migration 037_game_reminders.sql." };
    }

    return { reminders: [], loadError: error.message };
  }

  return {
    reminders: ((data ?? []) as GameReminderRow[]).map(gameReminderToClient),
    loadError: null
  };
}

export async function buildPlayerReminderContext(player: AuthorizedPlayer): Promise<PlayerReminderContext> {
  const supabase = createAdminClient();
  const [{ data: responseRows, error: responsesError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      supabase.from("poll_response").select("poll_id").eq("user_id", player.authUser.id),
      supabase.from("player_profiles").select("login_count").eq("id", player.authUser.id).maybeSingle()
    ]);

  if (responsesError) {
    throw new Error(responsesError.message);
  }

  if (profileError && !profileError.message.includes("login_count")) {
    throw new Error(profileError.message);
  }

  const rows = (responseRows ?? []) as Array<{ poll_id: string }>;
  const answeredPollIds = new Set(rows.map((row) => row.poll_id).filter(Boolean));

  return {
    pollsTaken: rows.length,
    loginCount: Math.max(0, Number(profileRow?.login_count ?? 0)),
    answeredPollIds,
    isRegistered: true
  };
}

export async function getPlayerGameReminderState(player: AuthorizedPlayer): Promise<PlayerGameReminderState> {
  const [{ reminders, loadError }, context] = await Promise.all([
    loadActiveGameReminders(),
    buildPlayerReminderContext(player)
  ]);
  const matched = evaluatePlayerReminders(reminders, context);
  const bundle = {
    popupReminders: matched.filter((reminder) => reminder.displayType === "popup"),
    inlineReminders: matched.filter((reminder) => reminder.displayType === "inline")
  };
  const matchedIds = new Set(matched.map((reminder) => reminder.id));

  return {
    bundle,
    diagnostics: {
      loadedAt: new Date().toISOString(),
      playerId: player.authUser.id,
      loadError,
      activeReminderCount: reminders.length,
      context: {
        pollsTaken: context.pollsTaken,
        loginCount: context.loginCount,
        isRegistered: context.isRegistered,
        answeredPollIds: [...context.answeredPollIds]
      },
      reminders: reminders.map((reminder) => {
        const explanation = explainReminderMatch(reminder, context);
        const queuedForDisplay = matchedIds.has(reminder.id);

        return {
          id: reminder.id,
          name: reminder.name,
          displayType: reminder.displayType,
          criterionSummary: formatReminderCriterionSummary(reminder),
          matched: explanation.matched,
          matchReason: explanation.reason,
          queuedForDisplay,
          blockedByDismissal: false
        };
      }),
      matchedPopupCount: bundle.popupReminders.length,
      matchedInlineCount: bundle.inlineReminders.length,
      visiblePopupCount: bundle.popupReminders.length,
      visibleInlineCount: bundle.inlineReminders.length
    }
  };
}

export async function getMatchedPlayerGameReminders(player: AuthorizedPlayer): Promise<PlayerGameReminderBundle> {
  const state = await getPlayerGameReminderState(player);
  return state.bundle;
}
