import { NORMIE_TOKEN_MINT_ADDRESS } from "@/lib/normie-token";
import { normalizeSolanaWalletAddress } from "@/lib/player-crypto-wallets";
import {
  getSolanaRpcEndpoint,
  isSolanaRpcConfigured,
  solanaJsonRpc,
  SolanaRpcConfigError,
  SolanaRpcRequestError
} from "@/lib/solana-rpc";

/** Pump.fun tokens commonly use 6 decimals; used only until mint metadata is fetched. */
export const NORMIE_TOKEN_DECIMALS_FALLBACK = 6;

type ParsedTokenAmount = {
  amount: string;
  decimals: number;
  uiAmountString?: string;
};

type TokenAccountsByOwnerResult = {
  value: Array<{
    account: {
      data: {
        parsed?: {
          info?: {
            tokenAmount?: ParsedTokenAmount;
          };
        };
      };
    };
  }>;
};

type MintAccountInfoResult = {
  value: {
    data: {
      parsed?: {
        info?: {
          decimals?: number;
        };
      };
    };
  } | null;
};

export type NormieWalletBalanceRow = {
  address: string;
  amountRaw: string;
  amountFormatted: string;
  amountUsdFormatted?: string | null;
  error?: string;
};

export type FetchNormieBalancesResult = {
  wallets: NormieWalletBalanceRow[];
  fetchedAt: string;
  decimals: number;
  configured: boolean;
};

let cachedMintDecimals: number | null = null;

export function resetNormieMintDecimalsCache(): void {
  cachedMintDecimals = null;
}

export function formatNormieTokenAmount(amountRaw: string, decimals: number): string {
  const normalized = amountRaw.replace(/\D/g, "") || "0";
  const raw = BigInt(normalized);

  if (decimals <= 0) {
    return raw.toLocaleString("en-US");
  }

  const scale = BigInt(10) ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;

  if (fraction === BigInt(0)) {
    return whole.toLocaleString("en-US");
  }

  const fractionDigits = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}.${fractionDigits}`;
}

export function sumParsedTokenAccounts(
  accounts: TokenAccountsByOwnerResult["value"],
  decimals: number
): { amountRaw: string; amountFormatted: string } {
  let total = BigInt(0);

  for (const entry of accounts) {
    const amount = entry.account?.data?.parsed?.info?.tokenAmount?.amount;

    if (!amount) {
      continue;
    }

    total += BigInt(amount.replace(/\D/g, "") || "0");
  }

  const amountRaw = total.toString();

  return {
    amountRaw,
    amountFormatted: formatNormieTokenAmount(amountRaw, decimals)
  };
}

export async function fetchNormieMintDecimals(
  options: { fetchImpl?: typeof fetch; endpoint?: string } = {}
): Promise<number> {
  if (cachedMintDecimals !== null) {
    return cachedMintDecimals;
  }

  try {
    const result = await solanaJsonRpc<MintAccountInfoResult>(
      "getAccountInfo",
      [NORMIE_TOKEN_MINT_ADDRESS, { encoding: "jsonParsed" }],
      options
    );

    const decimals = result.value?.data?.parsed?.info?.decimals;

    if (typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0 && decimals <= 18) {
      cachedMintDecimals = decimals;
      return decimals;
    }
  } catch {
    // Fall through to default decimals when mint metadata is unavailable.
  }

  cachedMintDecimals = NORMIE_TOKEN_DECIMALS_FALLBACK;
  return cachedMintDecimals;
}

async function fetchNormieBalanceForWallet(
  address: string,
  decimals: number,
  options: { fetchImpl?: typeof fetch; endpoint?: string } = {}
): Promise<Pick<NormieWalletBalanceRow, "amountRaw" | "amountFormatted">> {
  const result = await solanaJsonRpc<TokenAccountsByOwnerResult>(
    "getTokenAccountsByOwner",
    [address, { mint: NORMIE_TOKEN_MINT_ADDRESS }, { encoding: "jsonParsed" }],
    options
  );

  return sumParsedTokenAccounts(result.value ?? [], decimals);
}

function buildUnavailableRows(addresses: string[], message: string): NormieWalletBalanceRow[] {
  return addresses.map((address) => ({
    address,
    amountRaw: "0",
    amountFormatted: "0",
    error: message
  }));
}

export async function fetchNormieBalancesForWallets(
  addresses: string[],
  options: { fetchImpl?: typeof fetch; endpoint?: string } = {}
): Promise<FetchNormieBalancesResult> {
  const fetchedAt = new Date().toISOString();
  const normalized = addresses
    .map((address) => normalizeSolanaWalletAddress(address))
    .filter((address): address is string => Boolean(address));

  const uniqueAddresses = [...new Set(normalized)];

  if (!isSolanaRpcConfigured() && !options.endpoint) {
    return {
      wallets: buildUnavailableRows(uniqueAddresses, "Solana RPC is not configured."),
      fetchedAt,
      decimals: NORMIE_TOKEN_DECIMALS_FALLBACK,
      configured: false
    };
  }

  let decimals = NORMIE_TOKEN_DECIMALS_FALLBACK;

  try {
    decimals = await fetchNormieMintDecimals(options);
  } catch (error) {
    const message =
      error instanceof SolanaRpcConfigError || error instanceof SolanaRpcRequestError
        ? error.message
        : "Token decimals could not be loaded.";

    return {
      wallets: buildUnavailableRows(uniqueAddresses, message),
      fetchedAt,
      decimals: NORMIE_TOKEN_DECIMALS_FALLBACK,
      configured: Boolean(options.endpoint ?? getSolanaRpcEndpoint())
    };
  }

  const wallets = await Promise.all(
    uniqueAddresses.map(async (address): Promise<NormieWalletBalanceRow> => {
      try {
        const balance = await fetchNormieBalanceForWallet(address, decimals, options);

        return {
          address,
          amountRaw: balance.amountRaw,
          amountFormatted: balance.amountFormatted
        };
      } catch (error) {
        const message =
          error instanceof SolanaRpcConfigError || error instanceof SolanaRpcRequestError
            ? error.message
            : "Balance could not be loaded.";

        return {
          address,
          amountRaw: "0",
          amountFormatted: "0",
          error: message
        };
      }
    })
  );

  return {
    wallets,
    fetchedAt,
    decimals,
    configured: true
  };
}
