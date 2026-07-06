import { NextResponse } from "next/server";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { isMissingPlayerSchemaError, normalizePlayerHandle, safePlayerText } from "@/lib/player-auth";
import { isPlayerAwaitingEmailVerification } from "@/lib/player-email-confirmation";
import { sendPlayerSignupConfirmationEmail } from "@/lib/player-signup-confirmation-email";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { getRequestClientIp } from "@/lib/public-request";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";
import { getPlayerAuthCallbackUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

const REGISTER_RATE_LIMIT = 10;
const REGISTER_WINDOW_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const clientIp = getRequestClientIp(request);
  const rateLimit = await consumePublicRateLimit(
    `player-register:ip:${clientIp}`,
    REGISTER_RATE_LIMIT,
    REGISTER_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    handle?: unknown;
  };

  const email = safePlayerText(body.email, 255).toLowerCase();
  const password = safePlayerText(body.password, 255);
  const fullName = safePlayerText(body.fullName, 255);
  const handle = normalizePlayerHandle(body.handle, email);
  const redirectTo = getPlayerAuthCallbackUrl(request);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
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

  if (existingUser) {
    if (isPlayerAwaitingEmailVerification(existingUser)) {
      try {
        await sendPlayerSignupConfirmationEmail({
          email,
          redirectTo,
          fullName,
          handle
        });
      } catch (sendError) {
        return NextResponse.json(
          { error: sendError instanceof Error ? sendError.message : "Confirmation email could not be sent." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        user: { id: existingUser.id, email: existingUser.email ?? email, fullName, handle },
        needsEmailConfirmation: true
      });
    }

    const { error: profileError } = await adminClient.from("player_profiles").upsert(
      {
        id: existingUser.id,
        full_name: fullName || String(existingUser.user_metadata?.full_name ?? ""),
        handle: normalizePlayerHandle(handle || existingUser.user_metadata?.handle, email),
        status: "active"
      },
      { onConflict: "id" }
    );

    if (isMissingPlayerSchemaError(profileError)) {
      return NextResponse.json(
        { error: "Player Portal database tables are not installed yet. Apply supabase/player-portal.sql and try again." },
        { status: 503 }
      );
    }

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "That email already has an account. Use Login, or reset the password if needed." },
      { status: 409 }
    );
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo,
      data: { full_name: fullName, handle }
    }
  });

  if (linkError || !linkData.user) {
    return NextResponse.json({ error: linkError?.message ?? "Registration failed." }, { status: 400 });
  }

  const profile = {
    id: linkData.user.id,
    full_name: fullName,
    handle,
    status: "active"
  };

  const { data: profileRow, error: profileError } = await adminClient
    .from("player_profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id, full_name, handle, status, created_at, updated_at")
    .single();

  if (isMissingPlayerSchemaError(profileError)) {
    return NextResponse.json(
      { error: "Player Portal database tables are not installed yet. Apply supabase/player-portal.sql and try again." },
      { status: 503 }
    );
  }

  if (profileError || !profileRow) {
    return NextResponse.json(
      { error: profileError?.message ?? "Player profile could not be created." },
      { status: 500 }
    );
  }

  const needsEmailConfirmation = !linkData.user.email_confirmed_at;

  if (needsEmailConfirmation) {
    try {
      await sendPlayerSignupConfirmationEmail({
        email,
        redirectTo,
        fullName,
        handle,
        password,
        actionLink: linkData.properties?.action_link
      });
    } catch (sendError) {
      return NextResponse.json(
        { error: sendError instanceof Error ? sendError.message : "Confirmation email could not be sent." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: { id: linkData.user.id, email: linkData.user.email ?? email, fullName, handle },
      needsEmailConfirmation: true
    });
  }

  return NextResponse.json({
    user: { id: linkData.user.id, email: linkData.user.email ?? email, fullName, handle }
  });
}
