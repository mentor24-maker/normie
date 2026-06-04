import type { User } from "@supabase/supabase-js";
import { safeUserText } from "./admin-users";
import { normalizePlayerCryptoWallets } from "./player-crypto-wallets";
import { normalizePlayerHandle } from "./player-auth";

export const PUBLIC_USER_STATUSES = ["active", "suspended"] as const;

export type PublicUserStatus = (typeof PUBLIC_USER_STATUSES)[number];

export type PublicUserRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  status: string | null;
  crypto_wallets?: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export type PublicUserRecord = {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  status: PublicUserStatus;
  pollsTaken: number;
  pointsEarned: number;
  cryptoWallets: string[];
  lastSignInAt: string;
  emailConfirmedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function normalizePublicUserStatus(value: unknown): PublicUserStatus {
  const candidate = safeUserText(value, 40).toLowerCase();
  return PUBLIC_USER_STATUSES.includes(candidate as PublicUserStatus)
    ? (candidate as PublicUserStatus)
    : "active";
}

export function buildPublicUserFullName(firstName: string, lastName: string, fallback = "") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

export function mergePublicUserRecord(
  authUser: User,
  profile: PublicUserRow,
  stats: { pollsTaken?: number; pointsEarned?: number } = {}
): PublicUserRecord {
  const email = safeUserText(authUser.email, 255);
  const fullName = safeUserText(profile.full_name ?? authUser.user_metadata?.full_name, 255);

  return {
    id: safeUserText(profile.id || authUser.id, 80),
    email,
    fullName,
    handle: normalizePlayerHandle(profile.handle ?? authUser.user_metadata?.handle, email),
    status: normalizePublicUserStatus(profile.status),
    pollsTaken: stats.pollsTaken ?? 0,
    pointsEarned: stats.pointsEarned ?? 0,
    cryptoWallets: normalizePlayerCryptoWallets(profile.crypto_wallets),
    lastSignInAt: safeUserText(authUser.last_sign_in_at, 120),
    emailConfirmedAt: safeUserText(authUser.email_confirmed_at, 120),
    notes: "",
    createdAt: safeUserText(profile.created_at ?? authUser.created_at, 120),
    updatedAt: safeUserText(profile.updated_at ?? authUser.updated_at, 120)
  };
}
