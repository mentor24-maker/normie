import { NextResponse } from "next/server";
import { slugifyBlogText } from "@/lib/blog";
import { deleteAdminBlogTag, saveAdminBlogTag } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

type TagRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: TagRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { name?: unknown; slug?: unknown };

  try {
    const tag = await saveAdminBlogTag({
      id,
      name: safeText(body.name, 255),
      slug: slugifyBlogText(body.slug, 120)
    });
    return auth.finish(NextResponse.json({ tag }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update tag." },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(_request: Request, context: TagRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await deleteAdminBlogTag(id);
    return auth.finish(NextResponse.json({ ok: true }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete tag." },
        { status: 500 }
      )
    );
  }
}
