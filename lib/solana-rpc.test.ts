import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolanaRpcEndpoint, isSolanaRpcConfigured } from "@/lib/solana-rpc";
import { getSolanaRpcDiagnostics } from "@/lib/solana-rpc-config";

describe("getSolanaRpcEndpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("appends api-key when only base URL and key are provided", () => {
    vi.stubEnv("SOLANA_RPC_URL", "https://mainnet.helius-rpc.com");
    vi.stubEnv("SOLANA_RPC_API_KEY", "secret-key");
    expect(getSolanaRpcEndpoint()).toBe("https://mainnet.helius-rpc.com/?api-key=secret-key");
  });

  it("uses an api-key already embedded in SOLANA_RPC_URL", () => {
    vi.stubEnv("SOLANA_RPC_URL", "https://mainnet.helius-rpc.com/?api-key=embedded-key");
    vi.stubEnv("SOLANA_RPC_API_KEY", "");
    expect(getSolanaRpcEndpoint()).toBe("https://mainnet.helius-rpc.com/?api-key=embedded-key");
    expect(isSolanaRpcConfigured()).toBe(true);
  });
});
