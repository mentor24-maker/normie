import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolanaRpcDiagnostics, readSolanaRpcEnv } from "@/lib/solana-rpc-config";
import { getSolanaRpcEndpoint } from "@/lib/solana-rpc";

describe("readSolanaRpcEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("strips quotes and adds https when missing", () => {
    vi.stubEnv("SOLANA_RPC_URL", "'mainnet.helius-rpc.com'");
    vi.stubEnv("SOLANA_RPC_API_KEY", '"secret"');
    expect(readSolanaRpcEnv()).toEqual({
      rpcUrl: "https://mainnet.helius-rpc.com",
      apiKey: "secret"
    });
    expect(getSolanaRpcEndpoint()).toBe("https://mainnet.helius-rpc.com/?api-key=secret");
  });

  it("reports a helpful hint when the api key is missing", () => {
    vi.stubEnv("SOLANA_RPC_URL", "https://mainnet.helius-rpc.com");
    vi.stubEnv("SOLANA_RPC_API_KEY", "");
    expect(getSolanaRpcDiagnostics()).toMatchObject({
      endpointReady: false,
      hint: expect.stringContaining("SOLANA_RPC_API_KEY")
    });
  });
});
