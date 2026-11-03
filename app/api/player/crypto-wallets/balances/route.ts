import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import {
  buildPlayerCryptoWalletBalancesResponse,
  PLAYER_CRYPTO_WALLET_BALANCES_NO_STORE_HEADERS
} from "@/lib/player-crypto-wallet-balances-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonBalancesResponse(
  payload: { data?: unknown; error?: string },
  status = 200
) {
  return NextResponse.json(payload, {
    status,
    headers: PLAYER_CRYPTO_WALLET_BALANCES_NO_STORE_HEADERS
  });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return jsonBalancesResponse({ error: "Sign in to view your wallets balances." }, 401);
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const result = await buildPlayerCryptoWalletBalancesResponse(player, refresh);

  if ("error" in result) {
    return jsonBalancesResponse({ error: result.error }, result.status);
  }

  return jsonBalancesResponse({ data: result.data });
}

export async function POST() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return jsonBalancesResponse({ error: "Sign in to view your wallets balances." }, 401);
  }

  const result = await buildPlayerCryptoWalletBalancesResponse(player, true);

  if ("error" in result) {
    return jsonBalancesResponse({ error: result.error }, result.status);
  }

  return jsonBalancesResponse({ data: result.data });
}
