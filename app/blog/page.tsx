import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogIndexClient } from "@/components/blog-index-client";
import { blogSettingsToClientPayload, getPublicBlogSettings } from "@/lib/blog-settings";
import { listPublicBlogPosts, listPublicBlogTopicsAndTags } from "@/lib/blog-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog | Normie",
  description: "Insights on identity, money, relationships, and modern life from Normie."
};

type BlogIndexPageProps = {
  searchParams: Promise<{
    topic?: string;
    category?: string;
    tag?: string;
  }>;
};

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const params = await searchParams;
  const topicSlug = params.topic?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const tagSlug = params.tag?.trim() ?? "";
  const [{ posts, total }, taxonomy, blogSettings] = await Promise.all([
    listPublicBlogPosts({
      limit: 12,
      offset: 0,
      topicSlug: topicSlug || undefined,
      categorySlug: categorySlug || undefined,
      tagSlug: tagSlug || undefined
    }),
    listPublicBlogTopicsAndTags(),
    getPublicBlogSettings()
  ]);

  return (
    <Suspense fallback={null}>
      <BlogIndexClient
        categories={taxonomy.categories}
        initialPosts={posts}
        initialTotal={total}
        settings={blogSettingsToClientPayload(blogSettings)}
        tags={taxonomy.tags}
        topics={taxonomy.topics}
      />
    </Suspense>
  );
}
