import { NORMIE_TOKEN_MINT_ADDRESS, NORMIE_TOKEN_SYMBOL } from "@/lib/normie-token";

export function buildSolanaWalletExplorerUrl(walletAddress: string): string {
  const recipient = walletAddress.trim();
  return `https://solscan.io/account/${encodeURIComponent(recipient)}`;
}

/** Solana Pay transfer request — opens a wallet send flow for $NORMIE to this address. */
export function buildNormieWalletSendUrl(walletAddress: string): string {
  const recipient = walletAddress.trim();
  const params = new URLSearchParams({
    "spl-token": NORMIE_TOKEN_MINT_ADDRESS,
    label: "Normie",
    message: `Send ${NORMIE_TOKEN_SYMBOL}`
  });

  return `solana:${recipient}?${params.toString()}`;
}
