import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPlayerGameReminderStateFromCookies } from "@/lib/player-game-reminders";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const state = await getPlayerGameReminderStateFromCookies(cookieStore);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load reminders.",
        bundle: { popupReminders: [], inlineReminders: [] },
        diagnostics: {
          loadedAt: new Date().toISOString(),
          playerId: null,
          evaluationSource: "empty",
          sessionId: null,
          loadError: error instanceof Error ? error.message : "Failed to load reminders.",
          activeReminderCount: 0,
          context: {
            pollsTaken: 0,
            loginCount: 0,
            isRegistered: false,
            answeredPollIds: []
          },
          reminders: [],
          matchedPopupCount: 0,
          matchedInlineCount: 0,
          visiblePopupCount: 0,
          visibleInlineCount: 0
        }
      },
      { status: 500 }
    );
  }
}
