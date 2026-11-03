import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import {
  getPlayerPreferences,
  updatePlayerPreferences,
  type UpdatePlayerPreferencesInput
} from "@/lib/player-preferences";

export async function GET() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to view your preferences." }, { status: 401 });
  }

  const preferences = await getPlayerPreferences(player);

  if (!preferences) {
    return NextResponse.json({ error: "Preferences could not be loaded." }, { status: 404 });
  }

  return NextResponse.json({ data: preferences });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to update your preferences." }, { status: 401 });
  }

  const body = (await request.json()) as UpdatePlayerPreferencesInput;
  const result = await updatePlayerPreferences(player, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.preferences });
}
