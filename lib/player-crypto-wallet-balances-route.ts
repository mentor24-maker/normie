import type { AuthorizedPlayer } from "@/lib/player-auth";
import { getPlayerCryptoWallets, normalizeSolanaWalletAddress } from "@/lib/player-crypto-wallets";
import {
  enrichWalletBalancesWithUsd,
  fetchNormieTokenPriceQuote,
  type NormieTokenPriceSource
} from "@/lib/normie-token-price";
import {
  fetchNormieBalancesForWallets,
  type NormieWalletBalanceRow
} from "@/lib/normie-wallet-balances";
import { getSolanaRpcDiagnostics, isSolanaRpcConfigured } from "@/lib/solana-rpc";

export const PLAYER_CRYPTO_WALLET_BALANCES_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache"
};

function orderBalancesBySavedWallets(
  savedWallets: string[],
  balanceRows: NormieWalletBalanceRow[]
): NormieWalletBalanceRow[] {
  const balancesByAddress = new Map(balanceRows.map((row) => [row.address, row]));

  return savedWallets.map((address) => {
    const normalized = normalizeSolanaWalletAddress(address);
    const balance =
      balancesByAddress.get(address) ?? (normalized ? balancesByAddress.get(normalized) : undefined);

    if (!balance) {
      return {
        address,
        amountRaw: "0",
        amountFormatted: "0",
        amountUsdFormatted: null,
        error: "Balance could not be loaded."
      };
    }

    return {
      ...balance,
      address
    };
  });
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

async function buildLiveBalancesPayload(
  savedWallets: string[],
  refresh: boolean
): Promise<{
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
  chainSlot: number | null;
  tokenPriceUsd: number | null;
  tokenPriceSource: NormieTokenPriceSource;
  priceDiagnostics: Awaited<ReturnType<typeof fetchNormieTokenPriceQuote>>["diagnostics"];
}> {
  const [balances, priceQuote] = await Promise.all([
    fetchNormieBalancesForWallets(savedWallets, { refresh }),
    fetchNormieTokenPriceQuote({ refresh })
  ]);

  const priced = attachPriceToWallets(savedWallets, balances.wallets, balances.decimals, priceQuote);

  return {
    wallets: priced.wallets,
    fetchedAt: balances.fetchedAt,
    decimals: balances.decimals,
    configured: balances.configured,
    chainSlot: balances.chainSlot,
    tokenPriceUsd: priced.tokenPriceUsd,
    tokenPriceSource: priced.tokenPriceSource,
    priceDiagnostics: priced.priceDiagnostics
  };
}

export async function buildPlayerCryptoWalletBalancesResponse(
  player: AuthorizedPlayer,
  refresh: boolean
) {
  const savedWallets = await getPlayerCryptoWallets(player);

  if (!savedWallets) {
    return { status: 404 as const, error: "Wallets could not be loaded." };
  }

  const priceQuote = await fetchNormieTokenPriceQuote({ refresh });

  if (savedWallets.wallets.length === 0) {
    return {
      status: 200 as const,
      data: {
        wallets: [],
        fetchedAt: new Date().toISOString(),
        decimals: null,
        configured: isSolanaRpcConfigured(),
        chainSlot: null,
        tokenPriceUsd: priceQuote.priceUsd,
        tokenPriceSource: priceQuote.source,
        priceDiagnostics: priceQuote.diagnostics,
        rpcDiagnostics: getSolanaRpcDiagnostics(),
        cached: false,
        refreshed: refresh
      }
    };
  }

  const payload = await buildLiveBalancesPayload(savedWallets.wallets, refresh);

  return {
    status: 200 as const,
    data: {
      ...payload,
      rpcDiagnostics: getSolanaRpcDiagnostics(),
      cached: false,
      refreshed: refresh
    }
  };
}
