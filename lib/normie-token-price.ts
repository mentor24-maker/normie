import { NORMIE_TOKEN_MINT_ADDRESS } from "@/lib/normie-token";
import { formatNormieTokenAmount } from "@/lib/normie-wallet-balances";
import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

const DEXSCREENER_TOKEN_API_URL = `https://api.dexscreener.com/latest/dex/tokens/${NORMIE_TOKEN_MINT_ADDRESS}`;
const JUPITER_PRICE_API_URL = `https://lite-api.jup.ag/price/v3?ids=${NORMIE_TOKEN_MINT_ADDRESS}`;

const PRICE_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Normie/1.0 (wallet-balances)"
};

export const NORMIE_TOKEN_PRICE_CACHE_TTL_MS = 60_000;

export type NormieTokenPriceSource = "jupiter" | "dexscreener" | null;

export type NormieTokenPriceDiagnostics = {
  tokenPriceUsd: number | null;
  source: NormieTokenPriceSource;
  jupiterHttpStatus: number | null;
  dexscreenerHttpStatus: number | null;
  hint: string | null;
};

export type NormieTokenPriceQuote = {
  priceUsd: number | null;
  source: NormieTokenPriceSource;
  diagnostics: NormieTokenPriceDiagnostics;
};

type DexscreenerPair = {
  priceUsd?: string;
  liquidity?: {
    usd?: number;
  };
};

type DexscreenerTokenResponse = {
  pairs?: DexscreenerPair[] | null;
};

type JupiterPriceEntry = {
  usdPrice?: number;
};

type JupiterPriceResponse = Record<string, JupiterPriceEntry | undefined>;

let cachedTokenPrice: { priceUsd: number; source: NormieTokenPriceSource; expiresAt: number } | null =
  null;

export function resetNormieTokenPriceCache(): void {
  cachedTokenPrice = null;
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

export function formatWalletBalanceUsdFromRaw(
  amountRaw: string,
  decimals: number,
  priceUsd: number | null
): string | null {
  return formatWalletBalanceUsd(formatNormieTokenAmount(amountRaw, decimals), priceUsd);
}

async function fetchNormieTokenPriceFromJupiter(fetchImpl: typeof fetch): Promise<{
  price: number | null;
  httpStatus: number | null;
}> {
  try {
    const response = await fetchImpl(JUPITER_PRICE_API_URL, {
      cache: "no-store",
      headers: PRICE_FETCH_HEADERS,
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      return { price: null, httpStatus: response.status };
    }

    const payload = (await response.json()) as JupiterPriceResponse;
    const entry = payload[NORMIE_TOKEN_MINT_ADDRESS];
    const price = entry?.usdPrice;

    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return { price: null, httpStatus: response.status };
    }

    return { price, httpStatus: response.status };
  } catch {
    return { price: null, httpStatus: null };
  }
}

async function fetchNormieTokenPriceFromDexscreener(fetchImpl: typeof fetch): Promise<{
  price: number | null;
  httpStatus: number | null;
}> {
  try {
    const response = await fetchImpl(DEXSCREENER_TOKEN_API_URL, {
      cache: "no-store",
      headers: PRICE_FETCH_HEADERS,
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      return { price: null, httpStatus: response.status };
    }

    const payload = (await response.json()) as DexscreenerTokenResponse;
    const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];

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

    return { price: bestPrice, httpStatus: response.status };
  } catch {
    return { price: null, httpStatus: null };
  }
}

function buildPriceDiagnostics(
  priceUsd: number | null,
  source: NormieTokenPriceSource,
  jupiterHttpStatus: number | null,
  dexscreenerHttpStatus: number | null
): NormieTokenPriceDiagnostics {
  let hint: string | null = null;

  if (priceUsd === null) {
    if (jupiterHttpStatus && jupiterHttpStatus >= 400) {
      hint = `Jupiter price API returned HTTP ${jupiterHttpStatus}.`;
    } else if (dexscreenerHttpStatus && dexscreenerHttpStatus >= 400) {
      hint = `Dexscreener price API returned HTTP ${dexscreenerHttpStatus}.`;
    } else {
      hint = "USD price could not be loaded from Jupiter or Dexscreener.";
    }
  }

  return {
    tokenPriceUsd: priceUsd,
    source,
    jupiterHttpStatus,
    dexscreenerHttpStatus,
    hint
  };
}

export async function fetchNormieTokenPriceQuote(
  options: { fetchImpl?: typeof fetch; refresh?: boolean } = {}
): Promise<NormieTokenPriceQuote> {
  if (!options.refresh && cachedTokenPrice && Date.now() < cachedTokenPrice.expiresAt) {
    return {
      priceUsd: cachedTokenPrice.priceUsd,
      source: cachedTokenPrice.source,
      diagnostics: buildPriceDiagnostics(cachedTokenPrice.priceUsd, cachedTokenPrice.source, null, null)
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const jupiter = await fetchNormieTokenPriceFromJupiter(fetchImpl);

  if (jupiter.price !== null) {
    cachedTokenPrice = {
      priceUsd: jupiter.price,
      source: "jupiter",
      expiresAt: Date.now() + NORMIE_TOKEN_PRICE_CACHE_TTL_MS
    };

    return {
      priceUsd: jupiter.price,
      source: "jupiter",
      diagnostics: buildPriceDiagnostics(jupiter.price, "jupiter", jupiter.httpStatus, null)
    };
  }

  const dexscreener = await fetchNormieTokenPriceFromDexscreener(fetchImpl);

  if (dexscreener.price !== null) {
    cachedTokenPrice = {
      priceUsd: dexscreener.price,
      source: "dexscreener",
      expiresAt: Date.now() + NORMIE_TOKEN_PRICE_CACHE_TTL_MS
    };

    return {
      priceUsd: dexscreener.price,
      source: "dexscreener",
      diagnostics: buildPriceDiagnostics(
        dexscreener.price,
        "dexscreener",
        jupiter.httpStatus,
        dexscreener.httpStatus
      )
    };
  }

  if (cachedTokenPrice) {
    return {
      priceUsd: cachedTokenPrice.priceUsd,
      source: cachedTokenPrice.source,
      diagnostics: buildPriceDiagnostics(
        cachedTokenPrice.priceUsd,
        cachedTokenPrice.source,
        jupiter.httpStatus,
        dexscreener.httpStatus
      )
    };
  }

  return {
    priceUsd: null,
    source: null,
    diagnostics: buildPriceDiagnostics(null, null, jupiter.httpStatus, dexscreener.httpStatus)
  };
}

export async function fetchNormieTokenPriceUsd(
  options: { fetchImpl?: typeof fetch; refresh?: boolean } = {}
): Promise<number | null> {
  const quote = await fetchNormieTokenPriceQuote(options);
  return quote.priceUsd;
}

export function enrichWalletBalancesWithUsd(
  wallets: NormieWalletBalanceRow[],
  priceUsd: number | null,
  decimals = 6
): NormieWalletBalanceRow[] {
  return wallets.map((wallet) => ({
    ...wallet,
    amountUsdFormatted: wallet.error
      ? null
      : formatWalletBalanceUsdFromRaw(wallet.amountRaw, decimals, priceUsd)
  }));
}

export function sumWalletBalancesUsd(
  wallets: NormieWalletBalanceRow[],
  priceUsd: number | null,
  decimals = 6
): string | null {
  if (priceUsd === null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return null;
  }

  let total = 0;
  let hasAmount = false;

  for (const wallet of wallets) {
    if (wallet.error) {
      continue;
    }

    const amount = Number(formatNormieTokenAmount(wallet.amountRaw, decimals).replace(/,/g, ""));

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
