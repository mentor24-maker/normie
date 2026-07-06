import { NextResponse } from "next/server";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { safePlayerText } from "@/lib/player-auth";
import { sendPlayerPasswordResetEmail } from "@/lib/player-password-reset-email";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { getRequestClientIp } from "@/lib/public-request";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";
import { getPlayerPasswordResetUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

const PASSWORD_RESET_RATE_LIMIT = 5;
const PASSWORD_RESET_WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  const clientIp = getRequestClientIp(request);
  const rateLimit = await consumePublicRateLimit(
    `player-password-reset:ip:${clientIp}`,
    PASSWORD_RESET_RATE_LIMIT,
    PASSWORD_RESET_WINDOW_SECONDS
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
          "Player password reset email is not configured on the server. Set RESEND_API_KEY and AUTH_EMAIL_FROM in production."
      },
      { status: 503 }
    );
  }

  const redirectTo = getPlayerPasswordResetUrl(request);
  const adminClient = createAdminClient();

  let existingUser = false;
  try {
    existingUser = (await findAuthUserByEmail(adminClient, email)) !== null;
  } catch (listError) {
    return NextResponse.json(
      { error: listError instanceof Error ? listError.message : "Failed to list users." },
      { status: 500 }
    );
  }

  if (existingUser) {
    try {
      await sendPlayerPasswordResetEmail({
        email,
        redirectTo
      });
    } catch (sendError) {
      return NextResponse.json(
        { error: sendError instanceof Error ? sendError.message : "Password reset email could not be sent." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has a player account, a reset link has been sent."
  });
}
