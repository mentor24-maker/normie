import type { Metadata } from "next";
import { BlogIndexClient } from "@/components/blog-index-client";
import { listPublicBlogPosts, listPublicBlogTopicsAndTags } from "@/lib/blog-store";
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
  const [{ posts, total }, taxonomy] = await Promise.all([
    listPublicBlogPosts({
      limit: 12,
      offset: 0,
      topicSlug: topicSlug || undefined,
      categorySlug: categorySlug || undefined,
      tagSlug: tagSlug || undefined
    }),
    listPublicBlogTopicsAndTags()
  ]);

  return (
    <BlogIndexClient
      categories={taxonomy.categories}
      initialCategorySlug={categorySlug}
      initialPosts={posts}
      initialTagSlug={tagSlug}
      initialTopicSlug={topicSlug}
      initialTotal={total}
      tags={taxonomy.tags}
      topics={taxonomy.topics}
    />
  );
}
