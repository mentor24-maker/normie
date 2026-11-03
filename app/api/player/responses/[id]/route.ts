import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { updatePlayerResponseOption } from "@/lib/player-poll-response-update";
import { isUuid } from "@/lib/public-request";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to update your answers." }, { status: 401 });
  }

  const { id: responseId } = await context.params;

  if (!isUuid(responseId)) {
    return NextResponse.json({ error: "Invalid response identifier." }, { status: 400 });
  }

  const body = (await request.json()) as { optionId?: unknown };
  const optionId = typeof body.optionId === "string" ? body.optionId.trim() : "";

  if (!optionId) {
    return NextResponse.json({ error: "Option is required." }, { status: 400 });
  }

  const result = await updatePlayerResponseOption(player.authUser.id, responseId, optionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      optionId: result.optionId,
      answer: result.answer
    }
  });
}
