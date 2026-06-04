import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

export const NORMIE_WALLET_BALANCES_CACHE_TTL_MS = 90_000;

export type CachedNormieWalletBalances = {
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
  tokenPriceUsd: number | null;
  expiresAt: number;
};

const balancesCache = new Map<string, CachedNormieWalletBalances>();

export function buildWalletBalancesCacheKey(userId: string, walletAddresses: readonly string[]): string {
  return `${userId}:${walletAddresses.join(",")}`;
}

export function getCachedWalletBalances(cacheKey: string): CachedNormieWalletBalances | null {
  const entry = balancesCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    balancesCache.delete(cacheKey);
    return null;
  }

  return entry;
}

export function setCachedWalletBalances(
  cacheKey: string,
  payload: Omit<CachedNormieWalletBalances, "expiresAt">
): CachedNormieWalletBalances {
  const entry: CachedNormieWalletBalances = {
    ...payload,
    expiresAt: Date.now() + NORMIE_WALLET_BALANCES_CACHE_TTL_MS
  };

  balancesCache.set(cacheKey, entry);
  return entry;
}

export function invalidateWalletBalancesForUser(userId: string): void {
  const prefix = `${userId}:`;

  for (const key of balancesCache.keys()) {
    if (key.startsWith(prefix)) {
      balancesCache.delete(key);
    }
  }
}

export function clearWalletBalancesCache(): void {
  balancesCache.clear();
}
