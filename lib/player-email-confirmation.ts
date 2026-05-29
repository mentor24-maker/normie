import type { User } from "@supabase/supabase-js";
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
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  const authUser = (data.users ?? []).find((user) => user.email?.toLowerCase() === normalizedEmail);

  if (!authUser) {
    return "unknown";
  }

  return isPlayerAwaitingEmailVerification(authUser) ? "waiting_for_verification" : "confirmed";
}
