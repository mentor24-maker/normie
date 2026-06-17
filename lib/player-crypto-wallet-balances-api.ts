import type { NormieTokenPriceDiagnostics, NormieTokenPriceSource } from "@/lib/normie-token-price";
import type { SolanaRpcDiagnostics } from "@/lib/solana-rpc-config";
import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";

export type PlayerCryptoWalletBalancesResponse = {
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number | null;
  configured: boolean;
  tokenPriceUsd: number | null;
  tokenPriceSource: NormieTokenPriceSource;
  priceDiagnostics: NormieTokenPriceDiagnostics;
  rpcDiagnostics: SolanaRpcDiagnostics;
  chainSlot?: number | null;
  cached?: boolean;
  refreshed?: boolean;
};
