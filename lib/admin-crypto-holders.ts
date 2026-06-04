import type { User } from "@supabase/supabase-js";
import { safeUserText } from "@/lib/admin-users";
import {
  enrichWalletBalancesWithUsd,
  fetchNormieTokenPriceQuote
} from "@/lib/normie-token-price";
import { normalizePlayerHandle } from "@/lib/player-auth";
import { normalizePlayerCryptoWallets } from "@/lib/player-crypto-wallets";
import { mergePublicUserRecord, type PublicUserRow } from "@/lib/public-users";
import { fetchNormieBalancesForWallets } from "@/lib/normie-wallet-balances";
import { getSolanaRpcDiagnostics } from "@/lib/solana-rpc";
import { createAdminClient } from "@/lib/supabase-admin";

export type AdminCryptoHolderRow = {
  userId: string;
  fullName: string;
  email: string;
  handle: string;
  walletAddress: string;
  amountRaw: string;
  amountFormatted: string;
  amountUsdFormatted: string | null;
  error?: string;
};

export type AdminCryptoHoldersSnapshot = {
  rows: AdminCryptoHolderRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
  tokenPriceUsd: number | null;
  tokenPriceSource: string | null;
  priceDiagnostics: Awaited<ReturnType<typeof fetchNormieTokenPriceQuote>>["diagnostics"];
  rpcDiagnostics: ReturnType<typeof getSolanaRpcDiagnostics>;
  playerCount: number;
  walletCount: number;
};

export async function buildAdminCryptoHoldersSnapshot(
  refreshPrice = false
): Promise<AdminCryptoHoldersSnapshot> {
  const supabase = createAdminClient();
  const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase
      .from("player_profiles")
      .select("id, full_name, handle, status, crypto_wallets, created_at, updated_at")
      .order("full_name", { ascending: true })
  ]);

  if (authError) {
    throw new Error(authError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const authUsersById = new Map<string, User>(((authData?.users ?? []) as User[]).map((user) => [user.id, user]));
  const players = ((profiles ?? []) as PublicUserRow[]).map((profile) => {
    const authUser = authUsersById.get(profile.id);

    if (authUser) {
      return mergePublicUserRecord(authUser, profile);
    }

    const email = "—";
    const fullName = safeUserText(profile.full_name, 255) || "Unnamed player";

    return {
      id: profile.id,
      email,
      fullName,
      handle: profile.handle
        ? normalizePlayerHandle(profile.handle, email)
        : "—",
      status: "active" as const,
      pollsTaken: 0,
      pointsEarned: 0,
      cryptoWallets: normalizePlayerCryptoWallets(profile.crypto_wallets),
      lastSignInAt: "",
      emailConfirmedAt: "",
      notes: "",
      createdAt: safeUserText(profile.created_at, 120),
      updatedAt: safeUserText(profile.updated_at, 120)
    };
  });

  const playersWithWallets = players.filter(
    (player) => normalizePlayerCryptoWallets(player.cryptoWallets).length > 0
  );

  const uniqueAddresses = [
    ...new Set(
      playersWithWallets.flatMap((player) => normalizePlayerCryptoWallets(player.cryptoWallets))
    )
  ];

  const [balances, priceQuote] = await Promise.all([
    fetchNormieBalancesForWallets(uniqueAddresses),
    fetchNormieTokenPriceQuote({ refresh: refreshPrice })
  ]);

  const balancesByAddress = new Map(
    enrichWalletBalancesWithUsd(balances.wallets, priceQuote.priceUsd, balances.decimals).map((row) => [
      row.address,
      row
    ])
  );

  const rows: AdminCryptoHolderRow[] = [];

  for (const player of playersWithWallets) {
    const wallets = normalizePlayerCryptoWallets(player.cryptoWallets);

    for (const walletAddress of wallets) {
      const balance = balancesByAddress.get(walletAddress);

      rows.push({
        userId: player.id,
        fullName: player.fullName || "Unnamed player",
        email: player.email,
        handle: player.handle,
        walletAddress,
        amountRaw: balance?.amountRaw ?? "0",
        amountFormatted: balance?.amountFormatted ?? "0",
        amountUsdFormatted: balance?.amountUsdFormatted ?? null,
        error: balance?.error
      });
    }
  }

  rows.sort((left, right) => {
    const nameCompare = left.fullName.localeCompare(right.fullName, undefined, { sensitivity: "base" });

    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.walletAddress.localeCompare(right.walletAddress);
  });

  return {
    rows,
    fetchedAt: balances.fetchedAt,
    decimals: balances.decimals,
    configured: balances.configured,
    tokenPriceUsd: priceQuote.priceUsd,
    tokenPriceSource: priceQuote.source,
    priceDiagnostics: priceQuote.diagnostics,
    rpcDiagnostics: getSolanaRpcDiagnostics(),
    playerCount: playersWithWallets.length,
    walletCount: uniqueAddresses.length
  };
}
