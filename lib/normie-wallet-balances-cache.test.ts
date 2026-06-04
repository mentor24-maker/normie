import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWalletBalancesCacheKey,
  clearWalletBalancesCache,
  getCachedWalletBalances,
  invalidateWalletBalancesForUser,
  NORMIE_WALLET_BALANCES_CACHE_TTL_MS,
  setCachedWalletBalances
} from "@/lib/normie-wallet-balances-cache";

describe("normie wallet balances cache", () => {
  afterEach(() => {
    clearWalletBalancesCache();
    vi.useRealTimers();
  });

  it("builds a stable cache key from user id and wallet addresses", () => {
    expect(buildWalletBalancesCacheKey("user-1", ["aaa", "bbb"])).toBe("user-1:aaa,bbb");
  });

  it("returns cached balances until TTL expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00.000Z"));

    const key = buildWalletBalancesCacheKey("user-1", ["aaa"]);
    setCachedWalletBalances(key, {
      wallets: [{ address: "aaa", amountRaw: "1", amountFormatted: "1", amountUsdFormatted: "$1.00" }],
      fetchedAt: "2026-06-03T12:00:00.000Z",
      decimals: 6,
      configured: true,
      tokenPriceUsd: 1,
      tokenPriceSource: "jupiter"
    });

    expect(getCachedWalletBalances(key)?.wallets[0]?.amountFormatted).toBe("1");

    vi.advanceTimersByTime(NORMIE_WALLET_BALANCES_CACHE_TTL_MS - 1);
    expect(getCachedWalletBalances(key)?.wallets).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(getCachedWalletBalances(key)).toBeNull();
  });

  it("invalidates all cache entries for a user", () => {
    setCachedWalletBalances(buildWalletBalancesCacheKey("user-1", ["aaa"]), {
      wallets: [{ address: "aaa", amountRaw: "1", amountFormatted: "1", amountUsdFormatted: "$1.00" }],
      fetchedAt: "2026-06-03T12:00:00.000Z",
      decimals: 6,
      configured: true,
      tokenPriceUsd: 1,
      tokenPriceSource: "jupiter"
    });
    setCachedWalletBalances(buildWalletBalancesCacheKey("user-1", ["bbb"]), {
      wallets: [{ address: "bbb", amountRaw: "2", amountFormatted: "2", amountUsdFormatted: "$2.00" }],
      fetchedAt: "2026-06-03T12:00:00.000Z",
      decimals: 6,
      configured: true,
      tokenPriceUsd: 1,
      tokenPriceSource: "jupiter"
    });
    setCachedWalletBalances(buildWalletBalancesCacheKey("user-2", ["ccc"]), {
      wallets: [{ address: "ccc", amountRaw: "3", amountFormatted: "3", amountUsdFormatted: "$3.00" }],
      fetchedAt: "2026-06-03T12:00:00.000Z",
      decimals: 6,
      configured: true,
      tokenPriceUsd: 1,
      tokenPriceSource: "jupiter"
    });

    invalidateWalletBalancesForUser("user-1");

    expect(getCachedWalletBalances(buildWalletBalancesCacheKey("user-1", ["aaa"]))).toBeNull();
    expect(getCachedWalletBalances(buildWalletBalancesCacheKey("user-1", ["bbb"]))).toBeNull();
    expect(getCachedWalletBalances(buildWalletBalancesCacheKey("user-2", ["ccc"]))).not.toBeNull();
  });
});
