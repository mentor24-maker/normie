import { NextResponse } from "next/server";
import { safePlayerText } from "@/lib/player-auth";
import { sendPlayerPasswordResetEmail } from "@/lib/player-password-reset-email";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";
import { getPlayerPasswordResetUrl } from "@/lib/site-url";
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
          "Player password reset email is not configured on the server. Set RESEND_API_KEY and AUTH_EMAIL_FROM in production."
      },
      { status: 503 }
    );
  }

  const redirectTo = getPlayerPasswordResetUrl(request);
  const adminClient = createAdminClient();

  async function findExistingUser(): Promise<boolean> {
    const perPage = 1000;
    let page = 1;

    for (;;) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });

      if (error) {
        throw new Error(error.message);
      }

      const users = data.users ?? [];
      const found = users.some((user) => user.email?.toLowerCase() === email);

      if (found) {
        return true;
      }

      if (users.length < perPage) {
        return false;
      }

      page += 1;
    }
  }

  let existingUser = false;
  try {
    existingUser = await findExistingUser();
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
