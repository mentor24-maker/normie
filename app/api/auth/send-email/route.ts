import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendAuthEmailViaResend } from "@/lib/auth-email-send";
import { fetchBuilderEmailTemplate } from "@/lib/builder-email-store";
import { renderBuilderEmailHtmlWithFallback } from "@/lib/builder-email-render";
import {
  buildAuthEmailMergeContext,
  getAuthEmailSubject,
  mapAuthEmailActionToFunction,
  type SupabaseSendEmailPayload
} from "@/lib/supabase-auth-email";

export const runtime = "nodejs";

function getWebhookVerifier(): Webhook | null {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.trim();

  if (!secret) {
    return null;
  }

  const base64Secret = secret.startsWith("v1,whsec_") ? secret.replace("v1,whsec_", "") : secret;
  return new Webhook(base64Secret);
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

  try {
    const template = await fetchBuilderEmailTemplate(emailFunction);
    const mergeContext = buildAuthEmailMergeContext(verifiedPayload);
    const html = renderBuilderEmailHtmlWithFallback(template, mergeContext);
    const subject = getAuthEmailSubject(emailFunction);

    await sendAuthEmailViaResend({
      to: recipient,
      subject,
      html
    });

    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send auth email." },
      { status: 500 }
    );
  }
}
