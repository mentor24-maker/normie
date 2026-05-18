import { NextResponse } from "next/server";
import { listPublicBlogPosts } from "@/lib/blog-store";
import { safeText } from "@/lib/builder-template";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "12", 10) || 12, 1), 48);
  const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  const topicSlug = safeText(searchParams.get("topic"), 120);
  const categorySlug = safeText(searchParams.get("category"), 120);
  const tagSlug = safeText(searchParams.get("tag"), 120);

  try {
    const result = await listPublicBlogPosts({
      limit,
      offset,
      topicSlug: topicSlug || undefined,
      categorySlug: categorySlug || undefined,
      tagSlug: tagSlug || undefined
    });

    return NextResponse.json({
      posts: result.posts,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.posts.length < result.total
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load blog posts." },
      { status: 500 }
    );
  }
}
