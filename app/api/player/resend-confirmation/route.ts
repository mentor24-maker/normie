import { NextResponse } from "next/server";
import { safePlayerText } from "@/lib/player-auth";
import { isPlayerAwaitingEmailVerification } from "@/lib/player-email-confirmation";
import { sendPlayerSignupConfirmationEmail } from "@/lib/player-signup-confirmation-email";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";
import { getPlayerAuthCallbackUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
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
  const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email);

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
