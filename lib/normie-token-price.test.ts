import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enrichWalletBalancesWithUsd,
  formatWalletBalanceUsd,
  fetchNormieTokenPriceUsd,
  resetNormieTokenPriceCache
} from "@/lib/normie-token-price";

describe("formatWalletBalanceUsd", () => {
  it("formats token holdings as USD", () => {
    expect(formatWalletBalanceUsd("1,234.5", 0.002)).toBe("$2.47");
    expect(formatWalletBalanceUsd("0", 0.5)).toBe("$0.00");
  });

  it("returns null when price is unavailable", () => {
    expect(formatWalletBalanceUsd("100", null)).toBeNull();
  });
});

describe("fetchNormieTokenPriceUsd", () => {
  afterEach(() => {
    resetNormieTokenPriceCache();
  });

  it("reads priceUsd from the most liquid Dexscreener pair", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          pairs: [
            { priceUsd: "0.001", liquidity: { usd: 1000 } },
            { priceUsd: "0.0025", liquidity: { usd: 50000 } }
          ]
        }),
        { status: 200 }
      )
    );

    await expect(fetchNormieTokenPriceUsd({ fetchImpl })).resolves.toBe(0.0025);
  });
});

describe("enrichWalletBalancesWithUsd", () => {
  it("adds USD amounts per wallet row", () => {
    const rows = enrichWalletBalancesWithUsd(
      [{ address: "abc", amountRaw: "1000000", amountFormatted: "1" }],
      2
    );

    expect(rows[0]?.amountUsdFormatted).toBe("$2.00");
  });
});
