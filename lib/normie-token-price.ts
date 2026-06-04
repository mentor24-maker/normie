import { NORMIE_TOKEN_MINT_ADDRESS } from "@/lib/normie-token";
import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

const DEXSCREENER_TOKEN_API_URL = `https://api.dexscreener.com/latest/dex/tokens/${NORMIE_TOKEN_MINT_ADDRESS}`;

export const NORMIE_TOKEN_PRICE_CACHE_TTL_MS = 60_000;

type DexscreenerPair = {
  priceUsd?: string;
  liquidity?: {
    usd?: number;
  };
};

type DexscreenerTokenResponse = {
  pairs?: DexscreenerPair[];
};

let cachedTokenPriceUsd: { priceUsd: number; expiresAt: number } | null = null;

export function resetNormieTokenPriceCache(): void {
  cachedTokenPriceUsd = null;
}

export function formatWalletBalanceUsd(amountFormatted: string, priceUsd: number | null): string | null {
  if (priceUsd === null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return null;
  }

  const amount = Number(amountFormatted.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const usd = amount * priceUsd;

  if (usd === 0) {
    return "$0.00";
  }

  if (usd > 0 && usd < 0.01) {
    return "<$0.01";
  }

  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export async function fetchNormieTokenPriceUsd(
  options: { fetchImpl?: typeof fetch; refresh?: boolean } = {}
): Promise<number | null> {
  if (!options.refresh && cachedTokenPriceUsd && Date.now() < cachedTokenPriceUsd.expiresAt) {
    return cachedTokenPriceUsd.priceUsd;
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(DEXSCREENER_TOKEN_API_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return cachedTokenPriceUsd?.priceUsd ?? null;
    }

    const payload = (await response.json()) as DexscreenerTokenResponse;
    const pairs = payload.pairs ?? [];

    let bestPrice: number | null = null;
    let bestLiquidity = -1;

    for (const pair of pairs) {
      const liquidityUsd = pair.liquidity?.usd ?? 0;
      const price = Number(pair.priceUsd);

      if (!Number.isFinite(price) || price <= 0) {
        continue;
      }

      if (liquidityUsd > bestLiquidity) {
        bestLiquidity = liquidityUsd;
        bestPrice = price;
      }
    }

    if (bestPrice === null && pairs.length > 0) {
      const fallbackPrice = Number(pairs[0]?.priceUsd);

      if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
        bestPrice = fallbackPrice;
      }
    }

    if (bestPrice !== null) {
      cachedTokenPriceUsd = {
        priceUsd: bestPrice,
        expiresAt: Date.now() + NORMIE_TOKEN_PRICE_CACHE_TTL_MS
      };
      return bestPrice;
    }
  } catch {
    return cachedTokenPriceUsd?.priceUsd ?? null;
  }

  return cachedTokenPriceUsd?.priceUsd ?? null;
}

export function enrichWalletBalancesWithUsd(
  wallets: NormieWalletBalanceRow[],
  priceUsd: number | null
): NormieWalletBalanceRow[] {
  return wallets.map((wallet) => ({
    ...wallet,
    amountUsdFormatted: wallet.error
      ? null
      : formatWalletBalanceUsd(wallet.amountFormatted, priceUsd)
  }));
}

export function sumWalletBalancesUsd(wallets: NormieWalletBalanceRow[], priceUsd: number | null): string | null {
  if (priceUsd === null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return null;
  }

  let total = 0;
  let hasAmount = false;

  for (const wallet of wallets) {
    if (wallet.error) {
      continue;
    }

    const amount = Number(wallet.amountFormatted.replace(/,/g, ""));

    if (!Number.isFinite(amount)) {
      continue;
    }

    total += amount * priceUsd;
    hasAmount = true;
  }

  if (!hasAmount || total === 0) {
    return "$0.00";
  }

  if (total > 0 && total < 0.01) {
    return "<$0.01";
  }

  return total.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
