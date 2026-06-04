type JsonRpcError = {
  code: number;
  message: string;
};

type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: JsonRpcError;
};

export class SolanaRpcConfigError extends Error {
  constructor(message = "Solana RPC is not configured.") {
    super(message);
    this.name = "SolanaRpcConfigError";
  }
}

export class SolanaRpcRequestError extends Error {
  code: number;

  constructor(message: string, code = -1) {
    super(message);
    this.name = "SolanaRpcRequestError";
    this.code = code;
  }
}

export function getSolanaRpcEndpoint(): string | null {
  const base = String(process.env.SOLANA_RPC_URL ?? "").trim();
  const apiKey = String(process.env.SOLANA_RPC_API_KEY ?? "").trim();

  if (!base || !apiKey) {
    return null;
  }

  try {
    const url = new URL(base);
    url.searchParams.set("api-key", apiKey);
    return url.toString();
  } catch {
    return null;
  }
}

export function isSolanaRpcConfigured(): boolean {
  return Boolean(getSolanaRpcEndpoint());
}

let rpcRequestId = 1;

export async function solanaJsonRpc<T>(
  method: string,
  params: unknown[],
  options: { endpoint?: string; fetchImpl?: typeof fetch } = {}
): Promise<T> {
  const endpoint = options.endpoint ?? getSolanaRpcEndpoint();

  if (!endpoint) {
    throw new SolanaRpcConfigError();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcRequestId++,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new SolanaRpcRequestError(`Solana RPC HTTP ${response.status}.`, response.status);
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;

  if (payload.error) {
    throw new SolanaRpcRequestError(payload.error.message, payload.error.code);
  }

  if (payload.result === undefined) {
    throw new SolanaRpcRequestError("Solana RPC returned no result.");
  }

  return payload.result;
}
