import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { buildPlayerReminderContextFromRequest } from "@/lib/player-game-reminders";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const host = (await headers()).get("host");
    const meta = await buildPlayerReminderContextFromRequest(cookieStore, { host });

    return NextResponse.json({
      context: {
        pollsTaken: meta.context.pollsTaken,
        loginCount: meta.context.loginCount,
        isRegistered: meta.context.isRegistered,
        answeredPollIds: [...meta.context.answeredPollIds]
      },
      playerId: meta.playerId,
      evaluationSource: meta.evaluationSource,
      sessionId: meta.sessionId
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load reminder context.",
        context: {
          pollsTaken: 0,
          loginCount: 0,
          isRegistered: false,
          answeredPollIds: []
        },
        playerId: null,
        evaluationSource: "empty" as const,
        sessionId: null
      },
      { status: 500 }
    );
  }
}
