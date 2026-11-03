import { NextResponse } from "next/server";
import {
  getPlayerEmailConfirmationStatus,
  type PlayerEmailConfirmationStatus
} from "@/lib/player-email-confirmation";
import { safePlayerText } from "@/lib/player-auth";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { getRequestClientIp } from "@/lib/public-request";

// Generous limit: the register form fires a debounced status check as the
// player types their email, so legitimate use can hit this several times.
const CONFIRMATION_STATUS_RATE_LIMIT = 30;
const CONFIRMATION_STATUS_WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  const clientIp = getRequestClientIp(request);
  const rateLimit = await consumePublicRateLimit(
    `player-confirmation-status:ip:${clientIp}`,
    CONFIRMATION_STATUS_RATE_LIMIT,
    CONFIRMATION_STATUS_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { email?: unknown };
  const email = safePlayerText(body.email, 255).toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    const status: PlayerEmailConfirmationStatus = await getPlayerEmailConfirmationStatus(email);

    return NextResponse.json({
      status,
      awaitingVerification: status === "waiting_for_verification"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check confirmation status." },
      { status: 500 }
    );
  }
}
