import { describe, expect, it } from "vitest";
import { NORMIE_TOKEN_MINT_ADDRESS } from "@/lib/normie-token";
import { buildNormieWalletSendUrl, buildSolanaWalletExplorerUrl } from "@/lib/solana-wallet-links";

const SAMPLE_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

describe("solana-wallet-links", () => {
  it("builds a Solscan account URL", () => {
    expect(buildSolanaWalletExplorerUrl(SAMPLE_WALLET)).toBe(
      `https://solscan.io/account/${encodeURIComponent(SAMPLE_WALLET)}`
    );
  });

  it("builds a Solana Pay send URL for $NORMIE", () => {
    const url = buildNormieWalletSendUrl(SAMPLE_WALLET);

    expect(url.startsWith(`solana:${SAMPLE_WALLET}?`)).toBe(true);
    expect(url).toContain(`spl-token=${NORMIE_TOKEN_MINT_ADDRESS}`);
    expect(url).toContain("label=Normie");
  });
});
