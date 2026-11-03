import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import {
  addPlayerCryptoWallet,
  getPlayerCryptoWallets,
  removePlayerCryptoWallet,
  type UpdatePlayerCryptoWalletsInput
} from "@/lib/player-crypto-wallets";
import { invalidateWalletBalancesForUser } from "@/lib/normie-wallet-balances-cache";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to view your wallets." }, { status: 401 });
  }

  const wallets = await getPlayerCryptoWallets(player);

  if (!wallets) {
    return NextResponse.json({ error: "Wallets could not be loaded." }, { status: 404 });
  }

  return NextResponse.json({ data: wallets });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to register wallets." }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePlayerCryptoWalletsInput;
  const result = await addPlayerCryptoWallet(player, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  invalidateWalletBalancesForUser(player.authUser.id);

  return NextResponse.json({ data: result.wallets }, { status: 201 });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to remove wallets." }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePlayerCryptoWalletsInput;
  const result = await removePlayerCryptoWallet(player, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  invalidateWalletBalancesForUser(player.authUser.id);

  return NextResponse.json({ data: result.wallets });
}
