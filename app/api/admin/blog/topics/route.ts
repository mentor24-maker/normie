import { NextResponse } from "next/server";
import { slugifyBlogText } from "@/lib/blog";
import { listAdminBlogTopics, saveAdminBlogTopic } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

export async function GET() {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const topics = await listAdminBlogTopics();
    return auth.finish(NextResponse.json({ topics }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load topics." },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as { name?: unknown; slug?: unknown };

  try {
    const topic = await saveAdminBlogTopic({
      name: safeText(body.name, 255),
      slug: slugifyBlogText(body.slug, 120)
    });
    return auth.finish(NextResponse.json({ topic }, { status: 201 }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save topic." },
        { status: 500 }
      )
    );
  }
}
