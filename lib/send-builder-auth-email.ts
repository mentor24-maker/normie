import type { BuilderEmailFunction } from "@/lib/builder-email-template";
import { fetchBuilderEmailTemplate } from "@/lib/builder-email-store";
import { renderBuilderEmailHtmlWithFallback } from "@/lib/builder-email-render";
import { sendAuthEmailViaResend } from "@/lib/auth-email-send";
import { getAuthEmailSubject, type AuthEmailMergeContext } from "@/lib/supabase-auth-email";

export function isAuthEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim());
}

export async function sendBuilderAuthEmail(options: {
  emailFunction: BuilderEmailFunction;
  to: string;
  mergeContext: AuthEmailMergeContext;
}): Promise<void> {
  if (!isAuthEmailDeliveryConfigured()) {
    throw new Error("Auth email delivery is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM on the server.");
  }

  const template = await fetchBuilderEmailTemplate(options.emailFunction);
  const html = renderBuilderEmailHtmlWithFallback(template, options.mergeContext);

  await sendAuthEmailViaResend({
    to: options.to,
    subject: getAuthEmailSubject(options.emailFunction),
    html
  });
}
