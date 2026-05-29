import { sendBuilderAuthEmail } from "@/lib/send-builder-auth-email";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

function normalizeSupabaseActionLink(actionLink: string): string {
  const trimmed = String(actionLink ?? "").trim();

  if (!trimmed) {
    throw new Error("Supabase did not return a confirmation link.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, supabaseUrl).toString();
}

type SendPlayerSignupConfirmationEmailInput = {
  email: string;
  redirectTo: string;
  fullName?: string;
  handle?: string;
  password?: string;
  actionLink?: string;
};

async function createPlayerSignupConfirmationLink(
  input: SendPlayerSignupConfirmationEmailInput
): Promise<string> {
  const adminClient = createAdminClient();
  const email = input.email.trim().toLowerCase();

  if (input.password) {
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email,
      password: input.password,
      options: {
        redirectTo: input.redirectTo,
        data: {
          full_name: input.fullName ?? "",
          handle: input.handle ?? ""
        }
      }
    });

    if (error || !data.properties?.action_link) {
      throw new Error(error?.message ?? "Could not create a signup confirmation link.");
    }

    return normalizeSupabaseActionLink(data.properties.action_link);
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: input.redirectTo,
      data: {
        full_name: input.fullName ?? "",
        handle: input.handle ?? ""
      }
    }
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message ?? "Could not create a confirmation link for that email.");
  }

  return normalizeSupabaseActionLink(data.properties.action_link);
}

export async function sendPlayerSignupConfirmationEmail(
  input: SendPlayerSignupConfirmationEmailInput
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const confirmationUrl =
    input.actionLink != null && input.actionLink.trim()
      ? normalizeSupabaseActionLink(input.actionLink)
      : await createPlayerSignupConfirmationLink(input);

  await sendBuilderAuthEmail({
    emailFunction: "signup_confirmation",
    to: email,
    mergeContext: {
      confirmationUrl,
      email,
      siteUrl: getSiteUrl()
    }
  });
}
