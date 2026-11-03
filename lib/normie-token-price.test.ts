import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enrichWalletBalancesWithUsd,
  formatWalletBalanceUsd,
  fetchNormieTokenPriceQuote,
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

describe("fetchNormieTokenPriceQuote", () => {
  afterEach(() => {
    resetNormieTokenPriceCache();
  });

  it("reads usdPrice from Jupiter first", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("lite-api.jup.ag")) {
        return new Response(
          JSON.stringify({
            EiCDDbfnvtMAkN3vTjCmQCYtoeJtG4Wg3JTedRG8pump: {
              usdPrice: 0.0000135
            }
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ pairs: [] }), { status: 200 });
    });

    await expect(fetchNormieTokenPriceQuote({ fetchImpl })).resolves.toMatchObject({
      priceUsd: 0.0000135,
      source: "jupiter",
      diagnostics: {
        tokenPriceUsd: 0.0000135,
        source: "jupiter",
        jupiterHttpStatus: 200
      }
    });
  });

  it("falls back to Dexscreener when Jupiter has no price", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("lite-api.jup.ag")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          pairs: [{ priceUsd: "0.0025", liquidity: { usd: 50000 } }]
        }),
        { status: 200 }
      );
    });

    await expect(fetchNormieTokenPriceQuote({ fetchImpl })).resolves.toMatchObject({
      priceUsd: 0.0025,
      source: "dexscreener"
    });
  });

  it("returns diagnostics when both price sources fail", async () => {
    const fetchImpl = vi.fn(async () => new Response("blocked", { status: 403 }));

    await expect(fetchNormieTokenPriceQuote({ fetchImpl })).resolves.toMatchObject({
      priceUsd: null,
      source: null,
      diagnostics: {
        hint: expect.stringContaining("Jupiter")
      }
    });
  });
});

describe("enrichWalletBalancesWithUsd", () => {
  it("adds USD amounts per wallet row from raw balances", () => {
    const rows = enrichWalletBalancesWithUsd(
      [{ address: "abc", amountRaw: "1000000", amountFormatted: "1" }],
      2,
      6
    );

    expect(rows[0]?.amountUsdFormatted).toBe("$2.00");
  });
});
