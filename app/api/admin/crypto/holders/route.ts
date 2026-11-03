import { NextResponse } from "next/server";
import { buildAdminCryptoHoldersSnapshot } from "@/lib/admin-crypto-holders";
import { requireAdminRoute } from "@/lib/admin-route-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminRoute("users:read");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    const snapshot = await buildAdminCryptoHoldersSnapshot(refresh);

    return auth.finish(NextResponse.json({ data: snapshot }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Crypto holders could not be loaded." },
        { status: 500 }
      )
    );
  }
}
