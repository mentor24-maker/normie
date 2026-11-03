import { NextResponse } from "next/server";
import { slugifyBlogText } from "@/lib/blog";
import { deleteAdminBlogCategory, saveAdminBlogCategory } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

type CategoryRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: CategoryRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { name?: unknown; slug?: unknown };

  try {
    const category = await saveAdminBlogCategory({
      id,
      name: safeText(body.name, 255),
      slug: slugifyBlogText(body.slug, 120)
    });
    return auth.finish(NextResponse.json({ category }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update category." },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(_request: Request, context: CategoryRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await deleteAdminBlogCategory(id);
    return auth.finish(NextResponse.json({ ok: true }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete category." },
        { status: 500 }
      )
    );
  }
}
