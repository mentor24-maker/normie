import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerCryptoWallets } from "@/lib/player-crypto-wallets";
import {
  enrichWalletBalancesWithUsd,
  fetchNormieTokenPriceUsd,
  sumWalletBalancesUsd
} from "@/lib/normie-token-price";
import {
  fetchNormieBalancesForWallets,
  type NormieWalletBalanceRow
} from "@/lib/normie-wallet-balances";
import {
  buildWalletBalancesCacheKey,
  getCachedWalletBalances,
  setCachedWalletBalances
} from "@/lib/normie-wallet-balances-cache";
import { isSolanaRpcConfigured } from "@/lib/solana-rpc";

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

async function buildBalancesPayload(
  savedWallets: string[],
  refresh: boolean
): Promise<{
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
  tokenPriceUsd: number | null;
}> {
  const [balances, tokenPriceUsd] = await Promise.all([
    fetchNormieBalancesForWallets(savedWallets),
    fetchNormieTokenPriceUsd({ refresh })
  ]);

  const orderedWallets = orderBalancesBySavedWallets(savedWallets, balances.wallets);

  return {
    wallets: enrichWalletBalancesWithUsd(orderedWallets, tokenPriceUsd),
    fetchedAt: balances.fetchedAt,
    decimals: balances.decimals,
    configured: balances.configured,
    tokenPriceUsd
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

  if (savedWallets.wallets.length === 0) {
    return NextResponse.json({
      data: {
        wallets: [],
        fetchedAt: new Date().toISOString(),
        decimals: null,
        configured: isSolanaRpcConfigured(),
        tokenPriceUsd: await fetchNormieTokenPriceUsd(),
        cached: false
      }
    });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const cacheKey = buildWalletBalancesCacheKey(player.authUser.id, savedWallets.wallets);

  if (!refresh) {
    const cached = getCachedWalletBalances(cacheKey);

    if (cached) {
      return NextResponse.json({
        data: {
          wallets: orderBalancesBySavedWallets(savedWallets.wallets, cached.wallets),
          fetchedAt: cached.fetchedAt,
          decimals: cached.decimals,
          configured: cached.configured,
          tokenPriceUsd: cached.tokenPriceUsd,
          cached: true
        }
      });
    }
  }

  const payload = await buildBalancesPayload(savedWallets.wallets, refresh);

  setCachedWalletBalances(cacheKey, payload);

  return NextResponse.json({
    data: {
      ...payload,
      cached: false
    }
  });
}
