import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { linkPollToGalleryStorage } from "@/lib/poll-gallery-link";

function safeText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as { pollId?: unknown; storageName?: unknown };
    const pollId = safeText(body.pollId, 120);
    const storageName = safeText(body.storageName, 500);

    if (!pollId) {
      return auth.finish(NextResponse.json({ error: "A poll id is required." }, { status: 400 }));
    }

    if (!storageName) {
      return auth.finish(NextResponse.json({ error: "A gallery file name is required." }, { status: 400 }));
    }

    const poll = await linkPollToGalleryStorage(pollId, storageName);

    return auth.finish(NextResponse.json({ poll }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to associate gallery media with poll." },
        { status: 500 }
      )
    );
  }
}
