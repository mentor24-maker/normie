import { NextResponse } from "next/server";
import { slugifyBlogText } from "@/lib/blog";
import { deleteAdminBlogTopic, saveAdminBlogTopic } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

type TopicRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: TopicRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { name?: unknown; slug?: unknown };

  try {
    const topic = await saveAdminBlogTopic({
      id,
      name: safeText(body.name, 255),
      slug: slugifyBlogText(body.slug, 120)
    });
    return auth.finish(NextResponse.json({ topic }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update topic." },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(_request: Request, context: TopicRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await deleteAdminBlogTopic(id);
    return auth.finish(NextResponse.json({ ok: true }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete topic." },
        { status: 500 }
      )
    );
  }
}
