import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { createAdminClient } from "@/lib/supabase-admin";
import { safePlayerText } from "@/lib/player-auth";

export const PLAYER_WAITING_FOR_VERIFICATION_LABEL = "Waiting for verification";

export type PlayerEmailConfirmationStatus = "unknown" | "waiting_for_verification" | "confirmed";

export function isPlayerAwaitingEmailVerification(authUser: Pick<User, "email_confirmed_at">): boolean {
  return !authUser.email_confirmed_at;
}

export function formatPlayerLastSignIn(
  lastSignInAt: string,
  emailConfirmedAt: string
): string {
  if (!emailConfirmedAt) {
    return PLAYER_WAITING_FOR_VERIFICATION_LABEL;
  }

  if (!lastSignInAt) {
    return "Never";
  }

  const date = new Date(lastSignInAt);
  return Number.isNaN(date.getTime()) ? lastSignInAt : date.toLocaleString();
}

export async function getPlayerEmailConfirmationStatus(email: string): Promise<PlayerEmailConfirmationStatus> {
  const normalizedEmail = safePlayerText(email, 255).toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return "unknown";
  }

  const supabase = createAdminClient();
  const authUser = await findAuthUserByEmail(supabase, normalizedEmail);

  if (!authUser) {
    return "unknown";
  }

  return isPlayerAwaitingEmailVerification(authUser) ? "waiting_for_verification" : "confirmed";
}
