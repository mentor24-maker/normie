import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import {
  buildAuthEmailMergeContext,
  mapAuthEmailActionToFunction,
  type SupabaseSendEmailPayload
} from "@/lib/supabase-auth-email";
import { isAuthEmailDeliveryConfigured, sendBuilderAuthEmail } from "@/lib/send-builder-auth-email";

export const runtime = "nodejs";

function getWebhookVerifier(): Webhook | null {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.trim();

  if (!secret) {
    return null;
  }

  const base64Secret = secret.startsWith("v1,whsec_") ? secret.replace("v1,whsec_", "") : secret;
  return new Webhook(base64Secret);
}

export async function GET() {
  return NextResponse.json({
    hookSecretConfigured: Boolean(process.env.SEND_EMAIL_HOOK_SECRET?.trim()),
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    authFromConfigured: Boolean(process.env.AUTH_EMAIL_FROM?.trim()),
    playerSignupEmailReady: isAuthEmailDeliveryConfigured()
  });
}

export async function POST(request: Request) {
  const verifier = getWebhookVerifier();

  if (!verifier) {
    return NextResponse.json(
      { error: "SEND_EMAIL_HOOK_SECRET is not configured on the app server." },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let verifiedPayload: SupabaseSendEmailPayload;

  try {
    verifiedPayload = verifier.verify(payload, headers) as SupabaseSendEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid send-email hook signature." }, { status: 401 });
  }

  const emailFunction = mapAuthEmailActionToFunction(verifiedPayload.email_data.email_action_type);

  if (!emailFunction) {
    return NextResponse.json(
      { error: `Unsupported auth email action: ${verifiedPayload.email_data.email_action_type}` },
      { status: 422 }
    );
  }

  const recipient = verifiedPayload.user.new_email || verifiedPayload.user.email;

  if (!recipient) {
    return NextResponse.json({ error: "Auth email hook payload is missing recipient email." }, { status: 422 });
  }

  if (!isAuthEmailDeliveryConfigured()) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and AUTH_EMAIL_FROM must be configured on the app server." },
      { status: 503 }
    );
  }

  try {
    const mergeContext = buildAuthEmailMergeContext(verifiedPayload);

    await sendBuilderAuthEmail({
      emailFunction,
      to: recipient,
      mergeContext
    });

    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send auth email." },
      { status: 500 }
    );
  }
}
