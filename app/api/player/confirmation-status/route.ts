import { NextResponse } from "next/server";
import {
  getPlayerEmailConfirmationStatus,
  type PlayerEmailConfirmationStatus
} from "@/lib/player-email-confirmation";
import { safePlayerText } from "@/lib/player-auth";

export async function POST(request: Request) {
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
