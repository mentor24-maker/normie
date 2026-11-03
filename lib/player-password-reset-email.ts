import { normalizeSupabaseActionLink } from "@/lib/player-auth-action-link";
import { sendBuilderAuthEmail } from "@/lib/send-builder-auth-email";
import { getAuthEmailSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

type SendPlayerPasswordResetEmailInput = {
  email: string;
  redirectTo: string;
};

async function createPlayerPasswordResetLink(input: SendPlayerPasswordResetEmailInput): Promise<string> {
  const adminClient = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: input.redirectTo
    }
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message ?? "Could not create a password reset link.");
  }

  return normalizeSupabaseActionLink(data.properties.action_link);
}

export async function sendPlayerPasswordResetEmail(input: SendPlayerPasswordResetEmailInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const confirmationUrl = await createPlayerPasswordResetLink(input);

  await sendBuilderAuthEmail({
    emailFunction: "password_reset",
    to: email,
    mergeContext: {
      confirmationUrl,
      email,
      siteUrl: getAuthEmailSiteUrl()
    }
  });
}
