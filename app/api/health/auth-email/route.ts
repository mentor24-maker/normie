import { NextResponse } from "next/server";
import { isAuthEmailDeliveryConfigured } from "@/lib/send-builder-auth-email";

export const runtime = "nodejs";

/** Browser-friendly auth email config check (no secrets exposed). */
export async function GET() {
  return NextResponse.json({
    playerSignupEmailReady: isAuthEmailDeliveryConfigured(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    authFromConfigured: Boolean(process.env.AUTH_EMAIL_FROM?.trim()),
    hookSecretConfigured: Boolean(process.env.SEND_EMAIL_HOOK_SECRET?.trim()),
    sendEmailHookUrl: "https://www.normie.one/api/auth/send-email",
    note: "Supabase Send Email hook must POST to sendEmailHookUrl. Player signup uses Resend directly and only needs resendConfigured and authFromConfigured."
  });
}
