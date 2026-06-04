export type SolanaRpcEnv = {
  rpcUrl: string;
  apiKey: string;
};

export type SolanaRpcDiagnostics = {
  rpcUrlSet: boolean;
  apiKeySet: boolean;
  embeddedApiKeyInUrl: boolean;
  endpointReady: boolean;
  rpcHost: string | null;
  hint: string | null;
};

function normalizeEnvValue(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\s+/g, "");
}

function normalizeRpcBaseUrl(value: string): string {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

export function readSolanaRpcEnv(): SolanaRpcEnv {
  const rpcUrl =
    normalizeRpcBaseUrl(process.env.SOLANA_RPC_URL ?? "") ||
    normalizeRpcBaseUrl(process.env.HELIUS_RPC_URL ?? "");

  const apiKey =
    normalizeEnvValue(process.env.SOLANA_RPC_API_KEY) ||
    normalizeEnvValue(process.env.HELIUS_API_KEY) ||
    normalizeEnvValue(process.env.HELIUS_RPC_API_KEY);

  return { rpcUrl, apiKey };
}

export function getSolanaRpcDiagnostics(env: SolanaRpcEnv = readSolanaRpcEnv()): SolanaRpcDiagnostics {
  const rpcUrlSet = Boolean(env.rpcUrl);
  const apiKeySet = Boolean(env.apiKey);

  if (!rpcUrlSet) {
    return {
      rpcUrlSet,
      apiKeySet,
      embeddedApiKeyInUrl: false,
      endpointReady: false,
      rpcHost: null,
      hint: "Set SOLANA_RPC_URL (or HELIUS_RPC_URL) on the server, then redeploy."
    };
  }

  try {
    const url = new URL(env.rpcUrl);
    const embeddedApiKeyInUrl = Boolean(url.searchParams.get("api-key")?.trim());

    if (!embeddedApiKeyInUrl && !apiKeySet) {
      return {
        rpcUrlSet,
        apiKeySet,
        embeddedApiKeyInUrl,
        endpointReady: false,
        rpcHost: url.host,
        hint: "Set SOLANA_RPC_API_KEY (or HELIUS_API_KEY), or paste the full Helius URL with ?api-key= in SOLANA_RPC_URL."
      };
    }

    return {
      rpcUrlSet,
      apiKeySet,
      embeddedApiKeyInUrl,
      endpointReady: true,
      rpcHost: url.host,
      hint: null
    };
  } catch {
    return {
      rpcUrlSet,
      apiKeySet,
      embeddedApiKeyInUrl: false,
      endpointReady: false,
      rpcHost: null,
      hint: "SOLANA_RPC_URL must be a valid URL (include https://mainnet.helius-rpc.com)."
    };
  }
}
