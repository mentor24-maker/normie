import { normalizeSolanaWalletAddress } from "@/lib/player-crypto-wallets";
import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

export function buildWalletBalanceLookup(
  rows: readonly NormieWalletBalanceRow[]
): Map<string, NormieWalletBalanceRow> {
  const lookup = new Map<string, NormieWalletBalanceRow>();

  for (const row of rows) {
    lookup.set(row.address, row);

    const normalized = normalizeSolanaWalletAddress(row.address);

    if (normalized) {
      lookup.set(normalized, row);
    }
  }

  return lookup;
}

export function findWalletBalanceRow(
  lookup: Map<string, NormieWalletBalanceRow>,
  walletAddress: string
): NormieWalletBalanceRow | undefined {
  const normalized = normalizeSolanaWalletAddress(walletAddress);

  return lookup.get(walletAddress) ?? (normalized ? lookup.get(normalized) : undefined);
}

export function buildPlayerTokenWalletTableRows(
  wallets: readonly string[],
  balanceRows: readonly NormieWalletBalanceRow[] | undefined
): NormieWalletBalanceRow[] {
  if (!balanceRows?.length) {
    return wallets.map((address) => ({
      address,
      amountRaw: "0",
      amountFormatted: "0"
    }));
  }

  const lookup = buildWalletBalanceLookup(balanceRows);

  return wallets.map((address) => {
    const row = findWalletBalanceRow(lookup, address);

    if (!row) {
      return {
        address,
        amountRaw: "0",
        amountFormatted: "0",
        error: "Balance could not be loaded."
      };
    }

    return {
      ...row,
      address
    };
  });
}
