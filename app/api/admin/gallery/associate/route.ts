import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

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

    const imageUrl = normalizeBuilderAssetUrl(`/gallery/${storageName.replace(/^\/+/, "")}`);

    if (!imageUrl) {
      return auth.finish(NextResponse.json({ error: "Could not resolve a gallery image path." }, { status: 400 }));
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("polls")
      .update({ image_url: imageUrl })
      .eq("id", pollId)
      .select("id, category, question, image_url")
      .maybeSingle();

    if (error) {
      return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
    }

    if (!data) {
      return auth.finish(NextResponse.json({ error: "Poll not found." }, { status: 404 }));
    }

    return auth.finish(NextResponse.json({ poll: data }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to associate gallery media with poll." },
        { status: 500 }
      )
    );
  }
}
