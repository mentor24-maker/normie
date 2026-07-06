import { NextResponse } from "next/server";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { safePlayerText } from "@/lib/player-auth";
import { isPlayerAwaitingEmailVerification } from "@/lib/player-email-confirmation";
import { sendPlayerSignupConfirmationEmail } from "@/lib/player-signup-confirmation-email";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { getRequestClientIp } from "@/lib/public-request";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";
import { getPlayerAuthCallbackUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

const RESEND_CONFIRMATION_RATE_LIMIT = 5;
const RESEND_CONFIRMATION_WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  const clientIp = getRequestClientIp(request);
  const rateLimit = await consumePublicRateLimit(
    `player-resend-confirmation:ip:${clientIp}`,
    RESEND_CONFIRMATION_RATE_LIMIT,
    RESEND_CONFIRMATION_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { email?: unknown };
  const email = safePlayerText(body.email, 255).toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isAuthEmailDeliveryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Player confirmation email is not configured on the server. Set RESEND_API_KEY and AUTH_EMAIL_FROM in production."
      },
      { status: 503 }
    );
  }

  const adminClient = createAdminClient();

  let existingUser;
  try {
    existingUser = await findAuthUserByEmail(adminClient, email);
  } catch (lookupError) {
    return NextResponse.json(
      { error: lookupError instanceof Error ? lookupError.message : "Failed to look up account." },
      { status: 500 }
    );
  }

  if (!existingUser || !isPlayerAwaitingEmailVerification(existingUser)) {
    return NextResponse.json({
      ok: true,
      message: "If that email is waiting for confirmation, a new confirmation link has been sent."
    });
  }

  try {
    await sendPlayerSignupConfirmationEmail({
      email,
      redirectTo: getPlayerAuthCallbackUrl(request),
      fullName: String(existingUser.user_metadata?.full_name ?? ""),
      handle: String(existingUser.user_metadata?.handle ?? "")
    });
  } catch (sendError) {
    return NextResponse.json(
      { error: sendError instanceof Error ? sendError.message : "Confirmation email could not be sent." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is waiting for confirmation, a new confirmation link has been sent."
  });
}
