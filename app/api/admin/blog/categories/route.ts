import { NextResponse } from "next/server";
import { slugifyBlogText } from "@/lib/blog";
import { listAdminBlogCategories, saveAdminBlogCategory } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

export async function GET() {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const categories = await listAdminBlogCategories();
    return auth.finish(NextResponse.json({ categories }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load categories." },
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
    const category = await saveAdminBlogCategory({
      name: safeText(body.name, 255),
      slug: slugifyBlogText(body.slug, 120)
    });
    return auth.finish(NextResponse.json({ category }, { status: 201 }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save category." },
        { status: 500 }
      )
    );
  }
}
