import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

export type PlayerCryptoWalletBalancesResponse = {
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number | null;
  configured: boolean;
  tokenPriceUsd: number | null;
  cached?: boolean;
};
