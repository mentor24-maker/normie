import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { getAdminGameSnapshot } from "@/lib/game-admin";

export async function GET() {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const snapshot = await getAdminGameSnapshot();
    return auth.finish(NextResponse.json(snapshot));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load game settings." },
        { status: 500 }
      )
    );
  }
}

