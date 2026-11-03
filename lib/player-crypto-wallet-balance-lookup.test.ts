import { describe, expect, it } from "vitest";
import {
  buildPlayerTokenWalletTableRows,
  buildWalletBalanceLookup,
  findWalletBalanceRow
} from "@/lib/player-crypto-wallet-balance-lookup";

describe("player-crypto-wallet-balance-lookup", () => {
  it("finds balances by saved wallet address when row address was normalized", () => {
    const savedWallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    const lookup = buildWalletBalanceLookup([
      {
        address: savedWallet,
        amountRaw: "1000000",
        amountFormatted: "1"
      }
    ]);

    expect(findWalletBalanceRow(lookup, savedWallet)?.amountFormatted).toBe("1");
  });

  it("builds table rows from API balances using saved wallet addresses", () => {
    const savedWallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    const rows = buildPlayerTokenWalletTableRows(
      [savedWallet],
      [
        {
          address: savedWallet,
          amountRaw: "2500000",
          amountFormatted: "2.5",
          amountUsdFormatted: "$0.03"
        }
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.address).toBe(savedWallet);
    expect(rows[0]?.amountFormatted).toBe("2.5");
  });
});
