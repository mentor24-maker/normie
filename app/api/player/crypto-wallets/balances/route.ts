import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerCryptoWallets } from "@/lib/player-crypto-wallets";
import {
  enrichWalletBalancesWithUsd,
  fetchNormieTokenPriceQuote,
  type NormieTokenPriceSource
} from "@/lib/normie-token-price";
import {
  fetchNormieBalancesForWallets,
  type NormieWalletBalanceRow
} from "@/lib/normie-wallet-balances";
import {
  buildWalletBalancesCacheKey,
  deleteCachedWalletBalances,
  getCachedWalletBalances,
  setCachedWalletBalances
} from "@/lib/normie-wallet-balances-cache";
import { getSolanaRpcDiagnostics, isSolanaRpcConfigured } from "@/lib/solana-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderBalancesBySavedWallets(
  savedWallets: string[],
  balanceRows: NormieWalletBalanceRow[]
): NormieWalletBalanceRow[] {
  const balancesByAddress = new Map(balanceRows.map((row) => [row.address, row]));

  return savedWallets.map(
    (address) =>
      balancesByAddress.get(address) ?? {
        address,
        amountRaw: "0",
        amountFormatted: "0",
        amountUsdFormatted: null,
        error: "Balance could not be loaded."
      }
  );
}

function attachPriceToWallets(
  savedWallets: string[],
  balanceRows: NormieWalletBalanceRow[],
  decimals: number,
  priceQuote: Awaited<ReturnType<typeof fetchNormieTokenPriceQuote>>
) {
  const ordered = orderBalancesBySavedWallets(savedWallets, balanceRows);

  return {
    wallets: enrichWalletBalancesWithUsd(ordered, priceQuote.priceUsd, decimals),
    tokenPriceUsd: priceQuote.priceUsd,
    tokenPriceSource: priceQuote.source,
    priceDiagnostics: priceQuote.diagnostics
  };
}

async function buildBalancesPayload(
  savedWallets: string[],
  refresh: boolean
): Promise<{
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
  tokenPriceUsd: number | null;
  tokenPriceSource: NormieTokenPriceSource;
  priceDiagnostics: Awaited<ReturnType<typeof fetchNormieTokenPriceQuote>>["diagnostics"];
}> {
  const [balances, priceQuote] = await Promise.all([
    fetchNormieBalancesForWallets(savedWallets),
    fetchNormieTokenPriceQuote({ refresh })
  ]);

  const priced = attachPriceToWallets(savedWallets, balances.wallets, balances.decimals, priceQuote);

  return {
    wallets: priced.wallets,
    fetchedAt: balances.fetchedAt,
    decimals: balances.decimals,
    configured: balances.configured,
    tokenPriceUsd: priced.tokenPriceUsd,
    tokenPriceSource: priced.tokenPriceSource,
    priceDiagnostics: priced.priceDiagnostics
  };
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to view your wallets balances." }, { status: 401 });
  }

  const savedWallets = await getPlayerCryptoWallets(player);

  if (!savedWallets) {
    return NextResponse.json({ error: "Wallets could not be loaded." }, { status: 404 });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const priceQuote = await fetchNormieTokenPriceQuote({ refresh });

  if (savedWallets.wallets.length === 0) {
    return NextResponse.json({
      data: {
        wallets: [],
        fetchedAt: new Date().toISOString(),
        decimals: null,
        configured: isSolanaRpcConfigured(),
        tokenPriceUsd: priceQuote.priceUsd,
        tokenPriceSource: priceQuote.source,
        priceDiagnostics: priceQuote.diagnostics,
        rpcDiagnostics: getSolanaRpcDiagnostics(),
        cached: false
      }
    });
  }

  const cacheKey = buildWalletBalancesCacheKey(player.authUser.id, savedWallets.wallets);

  if (refresh) {
    deleteCachedWalletBalances(cacheKey);
  }

  if (!refresh) {
    const cached = getCachedWalletBalances(cacheKey);

    if (cached) {
      const priced = attachPriceToWallets(savedWallets.wallets, cached.wallets, cached.decimals, priceQuote);

      return NextResponse.json({
        data: {
          wallets: priced.wallets,
          fetchedAt: cached.fetchedAt,
          decimals: cached.decimals,
          configured: cached.configured,
          tokenPriceUsd: priced.tokenPriceUsd,
          tokenPriceSource: priced.tokenPriceSource,
          priceDiagnostics: priced.priceDiagnostics,
          rpcDiagnostics: getSolanaRpcDiagnostics(),
          cached: true
        }
      });
    }
  }

  const payload = await buildBalancesPayload(savedWallets.wallets, refresh);

  setCachedWalletBalances(cacheKey, {
    wallets: payload.wallets.map((wallet) => ({
      address: wallet.address,
      amountRaw: wallet.amountRaw,
      amountFormatted: wallet.amountFormatted,
      error: wallet.error
    })),
    fetchedAt: payload.fetchedAt,
    decimals: payload.decimals,
    configured: payload.configured,
    tokenPriceUsd: payload.tokenPriceUsd,
    tokenPriceSource: payload.tokenPriceSource
  });

  return NextResponse.json({
    data: {
      ...payload,
      rpcDiagnostics: getSolanaRpcDiagnostics(),
      cached: false
    }
  });
}
