import { NextResponse } from "next/server";
import { assertBlogStatusAllowed } from "@/lib/blog-admin-auth";
import { normalizeBlogPostEditorInput, validateBlogPostInput } from "@/lib/blog";
import { listAdminBlogPosts, saveAdminBlogPost } from "@/lib/blog-store";
import { requireAdminRoute } from "@/lib/admin-route-auth";

export async function GET() {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const posts = await listAdminBlogPosts();
    return auth.finish(NextResponse.json({ posts }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load blog posts." },
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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = normalizeBlogPostEditorInput(body);
    const validationError = validateBlogPostInput(input);

    if (validationError) {
      return auth.finish(NextResponse.json({ error: validationError }, { status: 400 }));
    }

    const statusError = assertBlogStatusAllowed(auth.admin, input.status);

    if (statusError) {
      return auth.finish(statusError);
    }

    const post = await saveAdminBlogPost(input);
    return auth.finish(NextResponse.json({ post }, { status: 201 }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save blog post." },
        { status: 500 }
      )
    );
  }
}
