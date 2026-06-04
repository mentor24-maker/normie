import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolanaRpcEndpoint } from "@/lib/solana-rpc";
import {
  fetchNormieBalancesForWallets,
  formatNormieTokenAmount,
  NORMIE_TOKEN_DECIMALS_FALLBACK,
  resetNormieMintDecimalsCache,
  sumParsedTokenAccounts
} from "@/lib/normie-wallet-balances";

describe("getSolanaRpcEndpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when env vars are missing", () => {
    vi.stubEnv("SOLANA_RPC_URL", "");
    vi.stubEnv("SOLANA_RPC_API_KEY", "");
    expect(getSolanaRpcEndpoint()).toBeNull();
  });

  it("appends the api key query param to the base URL", () => {
    vi.stubEnv("SOLANA_RPC_URL", "https://mainnet.helius-rpc.com");
    vi.stubEnv("SOLANA_RPC_API_KEY", "test-key");
    expect(getSolanaRpcEndpoint()).toBe("https://mainnet.helius-rpc.com/?api-key=test-key");
  });
});

describe("formatNormieTokenAmount", () => {
  it("formats whole-token amounts with grouping", () => {
    expect(formatNormieTokenAmount("1000000", 6)).toBe("1");
    expect(formatNormieTokenAmount("2500000", 6)).toBe("2.5");
    expect(formatNormieTokenAmount("1234567890", 6)).toBe("1,234.56789");
  });

  it("returns zero for empty raw amounts", () => {
    expect(formatNormieTokenAmount("", 6)).toBe("0");
  });
});

describe("sumParsedTokenAccounts", () => {
  it("sums multiple token accounts for the same mint", () => {
    const result = sumParsedTokenAccounts(
      [
        {
          account: {
            data: {
              parsed: {
                info: {
                  tokenAmount: { amount: "1500000", decimals: 6, uiAmountString: "1.5" }
                }
              }
            }
          }
        },
        {
          account: {
            data: {
              parsed: {
                info: {
                  tokenAmount: { amount: "500000", decimals: 6, uiAmountString: "0.5" }
                }
              }
            }
          }
        }
      ],
      6
    );

    expect(result.amountRaw).toBe("2000000");
    expect(result.amountFormatted).toBe("2");
  });

  it("returns zero when no token accounts exist", () => {
    const result = sumParsedTokenAccounts([], 6);
    expect(result.amountRaw).toBe("0");
    expect(result.amountFormatted).toBe("0");
  });
});

describe("fetchNormieBalancesForWallets", () => {
  afterEach(() => {
    resetNormieMintDecimalsCache();
    vi.unstubAllEnvs();
  });

  it("returns configured=false when RPC env vars are missing", async () => {
    vi.stubEnv("SOLANA_RPC_URL", "");
    vi.stubEnv("SOLANA_RPC_API_KEY", "");

    const result = await fetchNormieBalancesForWallets(["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuGuiosq"]);

    expect(result.configured).toBe(false);
    expect(result.decimals).toBe(NORMIE_TOKEN_DECIMALS_FALLBACK);
    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0]?.error).toContain("SOLANA_RPC_URL");
  });

  it("loads balances from mocked RPC responses", async () => {
    const endpoint = "https://mainnet.helius-rpc.com/?api-key=test-key";
    const wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuGuiosq";

    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method: string };

      if (body.method === "getAccountInfo") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              value: {
                data: {
                  parsed: {
                    info: {
                      decimals: 6
                    }
                  }
                }
              }
            }
          }),
          { status: 200 }
        );
      }

      if (body.method === "getTokenAccountsByOwner") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          tokenAmount: {
                            amount: "4200000",
                            decimals: 6,
                            uiAmountString: "4.2"
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -1, message: "Unknown" } }), {
        status: 200
      });
    });

    const result = await fetchNormieBalancesForWallets([wallet], { endpoint, fetchImpl });

    expect(result.configured).toBe(true);
    expect(result.decimals).toBe(6);
    expect(result.wallets).toEqual([
      {
        address: wallet,
        amountRaw: "4200000",
        amountFormatted: "4.2"
      }
    ]);
    expect(fetchImpl).toHaveBeenCalled();
  });
});
