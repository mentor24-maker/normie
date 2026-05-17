import { NextResponse } from "next/server";
import { assertBlogStatusAllowed } from "@/lib/blog-admin-auth";
import { normalizeBlogPostEditorInput, validateBlogPostInput } from "@/lib/blog";
import { deleteAdminBlogPost, getAdminBlogPostById, saveAdminBlogPost } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeText } from "@/lib/builder-template";

type BlogPostRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: BlogPostRouteContext) {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    const post = await getAdminBlogPostById(id);

    if (!post) {
      return auth.finish(NextResponse.json({ error: "Post not found." }, { status: 404 }));
    }

    return auth.finish(NextResponse.json({ post }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load blog post." },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(request: Request, context: BlogPostRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const input = normalizeBlogPostEditorInput({ ...body, id });
  const validationError = validateBlogPostInput(input);

  if (validationError) {
    return auth.finish(NextResponse.json({ error: validationError }, { status: 400 }));
  }

  const statusError = assertBlogStatusAllowed(auth.admin, input.status);

  if (statusError) {
    return auth.finish(statusError);
  }

  try {
    const post = await saveAdminBlogPost(input, safeText(id, 120));

    if (!post) {
      return auth.finish(NextResponse.json({ error: "Post not found." }, { status: 404 }));
    }

    return auth.finish(NextResponse.json({ post }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save blog post." },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(_request: Request, context: BlogPostRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await deleteAdminBlogPost(id);
    return auth.finish(NextResponse.json({ ok: true }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete blog post." },
        { status: 500 }
      )
    );
  }
}
