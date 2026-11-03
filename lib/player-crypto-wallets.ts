import {
  fetchPlayerProfileRow,
  isMissingPlayerSchemaError,
  isMissingProfileColumnError,
  safePlayerText,
  type AuthorizedPlayer,
  type PlayerProfileRow
} from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export const MAX_PLAYER_CRYPTO_WALLETS = 10;

const SOLANA_WALLET_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const CRYPTO_WALLET_PROFILE_SELECT = "id, full_name, handle, status, created_at, updated_at, crypto_wallets";

export type PlayerCryptoWallets = {
  wallets: string[];
};

export type UpdatePlayerCryptoWalletsInput = {
  address?: unknown;
};

export type UpdatePlayerCryptoWalletsResult =
  | { ok: true; wallets: PlayerCryptoWallets }
  | { ok: false; error: string; status: number };

export function normalizeSolanaWalletAddress(value: unknown): string | null {
  const address = safePlayerText(value, 64);

  if (!address || !SOLANA_WALLET_ADDRESS_PATTERN.test(address)) {
    return null;
  }

  return address;
}

export function normalizePlayerCryptoWallets(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const wallets: string[] = [];

  for (const entry of value) {
    const address = normalizeSolanaWalletAddress(entry);

    if (!address || seen.has(address)) {
      continue;
    }

    seen.add(address);
    wallets.push(address);

    if (wallets.length >= MAX_PLAYER_CRYPTO_WALLETS) {
      break;
    }
  }

  return wallets;
}

export function buildPlayerCryptoWallets(profile: PlayerProfileRow): PlayerCryptoWallets {
  return {
    wallets: normalizePlayerCryptoWallets(profile.crypto_wallets)
  };
}

export async function getPlayerCryptoWallets(player: AuthorizedPlayer): Promise<PlayerCryptoWallets | null> {
  const profile = await fetchPlayerProfileRow(player.authUser.id, { select: CRYPTO_WALLET_PROFILE_SELECT });

  if (!profile) {
    return null;
  }

  return buildPlayerCryptoWallets(profile);
}

export async function addPlayerCryptoWallet(
  player: AuthorizedPlayer,
  input: UpdatePlayerCryptoWalletsInput
): Promise<UpdatePlayerCryptoWalletsResult> {
  const address = normalizeSolanaWalletAddress(input.address);

  if (!address) {
    return { ok: false, error: "Enter a valid Solana wallets address.", status: 400 };
  }

  const existingProfile = await fetchPlayerProfileRow(player.authUser.id, {
    select: CRYPTO_WALLET_PROFILE_SELECT
  });

  if (!existingProfile) {
    return { ok: false, error: "Profile could not be loaded.", status: 404 };
  }

  const existing = buildPlayerCryptoWallets(existingProfile);

  if (existing.wallets.includes(address)) {
    return { ok: false, error: "That wallets address is already registered.", status: 409 };
  }

  if (existing.wallets.length >= MAX_PLAYER_CRYPTO_WALLETS) {
    return {
      ok: false,
      error: `You can register up to ${MAX_PLAYER_CRYPTO_WALLETS} wallets.`,
      status: 400
    };
  }

  const wallets = [...existing.wallets, address];
  const updatedAt = new Date().toISOString();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("player_profiles")
    .update({
      crypto_wallets: wallets,
      updated_at: updatedAt
    })
    .eq("id", player.authUser.id)
    .select(CRYPTO_WALLET_PROFILE_SELECT)
    .single();

  if (isMissingProfileColumnError(error)) {
    return {
      ok: false,
      error: "Crypto wallets are not installed yet. Apply migration 051_player_crypto_wallets.sql.",
      status: 503
    };
  }

  if (isMissingPlayerSchemaError(error)) {
    return {
      ok: false,
      error: "Player Portal is not installed yet. Apply the latest Supabase migrations.",
      status: 503
    };
  }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Wallets could not be saved.", status: 500 };
  }

  return {
    ok: true,
    wallets: buildPlayerCryptoWallets(data as PlayerProfileRow)
  };
}

export async function removePlayerCryptoWallet(
  player: AuthorizedPlayer,
  input: UpdatePlayerCryptoWalletsInput
): Promise<UpdatePlayerCryptoWalletsResult> {
  const address = normalizeSolanaWalletAddress(input.address);

  if (!address) {
    return { ok: false, error: "Enter a valid Solana wallets address.", status: 400 };
  }

  const existingProfile = await fetchPlayerProfileRow(player.authUser.id, {
    select: CRYPTO_WALLET_PROFILE_SELECT
  });

  if (!existingProfile) {
    return { ok: false, error: "Profile could not be loaded.", status: 404 };
  }

  const existing = buildPlayerCryptoWallets(existingProfile);
  const wallets = existing.wallets.filter((wallet) => wallet !== address);

  if (wallets.length === existing.wallets.length) {
    return { ok: false, error: "That wallets address is not registered.", status: 404 };
  }

  const updatedAt = new Date().toISOString();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("player_profiles")
    .update({
      crypto_wallets: wallets,
      updated_at: updatedAt
    })
    .eq("id", player.authUser.id)
    .select(CRYPTO_WALLET_PROFILE_SELECT)
    .single();

  if (isMissingProfileColumnError(error)) {
    return {
      ok: false,
      error: "Crypto wallets are not installed yet. Apply migration 051_player_crypto_wallets.sql.",
      status: 503
    };
  }

  if (isMissingPlayerSchemaError(error)) {
    return {
      ok: false,
      error: "Player Portal is not installed yet. Apply the latest Supabase migrations.",
      status: 503
    };
  }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Wallets could not be removed.", status: 500 };
  }

  return {
    ok: true,
    wallets: buildPlayerCryptoWallets(data as PlayerProfileRow)
  };
}
