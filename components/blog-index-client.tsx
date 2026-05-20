"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BlogPostSidebar } from "@/components/blog-post-sidebar";
import { getBlogSettingsCssVariables, type BlogSettingsSnapshot } from "@/lib/blog-settings";
import {
  formatBlogPublishedDate,
  getBlogPostPath,
  getBlogTaxonomyFilterPath,
  normalizePublicBlogImageUrl,
  type BlogCategoryRecord,
  type BlogPostCard,
  type BlogTagRecord,
  type BlogTopicRecord
} from "@/lib/blog";

type BlogFilters = {
  topicSlug: string;
  categorySlug: string;
  tagSlug: string;
};

type BlogIndexClientProps = {
  initialPosts: BlogPostCard[];
  initialTotal: number;
  settings: BlogSettingsSnapshot;
  topics: BlogTopicRecord[];
  categories: BlogCategoryRecord[];
  tags: BlogTagRecord[];
};

const PAGE_SIZE = 12;

export function BlogIndexClient({
  initialPosts,
  initialTotal,
  settings,
  topics,
  categories,
  tags
}: BlogIndexClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicSlug = searchParams?.get("topic") ?? "";
  const categorySlug = searchParams?.get("category") ?? "";
  const tagSlug = searchParams?.get("tag") ?? "";

  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialPosts.length);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setTotal(initialTotal);
    setOffset(initialPosts.length);
  }, [initialPosts, initialTotal]);

  async function fetchPosts(nextOffset: number, replace: boolean, filters: BlogFilters) {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset)
      });

      if (filters.topicSlug) {
        params.set("topic", filters.topicSlug);
      }

      if (filters.categorySlug) {
        params.set("category", filters.categorySlug);
      }

      if (filters.tagSlug) {
        params.set("tag", filters.tagSlug);
      }

      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      const payload = (await response.json()) as {
        posts?: BlogPostCard[];
        total?: number;
      };

      if (!response.ok) {
        return;
      }

      const nextPosts = payload.posts ?? [];
      setPosts((current) => (replace ? nextPosts : [...current, ...nextPosts]));
      setTotal(payload.total ?? 0);
      setOffset(nextOffset + nextPosts.length);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters(nextFilters: BlogFilters) {
    const params = new URLSearchParams();

    if (nextFilters.topicSlug) {
      params.set("topic", nextFilters.topicSlug);
    }

    if (nextFilters.categorySlug) {
      params.set("category", nextFilters.categorySlug);
    }

    if (nextFilters.tagSlug) {
      params.set("tag", nextFilters.tagSlug);
    }

    const query = params.toString();
    router.replace(query ? `/blog?${query}` : "/blog", { scroll: false });
    void fetchPosts(0, true, nextFilters);
  }

  const hasMore = offset < total;

  return (
    <div className="blog-post-layout" style={getBlogSettingsCssVariables(settings)}>
      <section className="blog-index">
      <div className="blog-index-filters">
        <label className="field blog-filter-field">
          <span>Topic</span>
          <select
            value={topicSlug}
            onChange={(event) =>
              applyFilters({ topicSlug: event.target.value, categorySlug, tagSlug })
            }
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.slug}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field blog-filter-field">
          <span>Category</span>
          <select
            value={categorySlug}
            onChange={(event) =>
              applyFilters({ topicSlug, categorySlug: event.target.value, tagSlug })
            }
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field blog-filter-field">
          <span>Tag</span>
          <select
            value={tagSlug}
            onChange={(event) =>
              applyFilters({ topicSlug, categorySlug, tagSlug: event.target.value })
            }
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="blog-card-grid">
        {posts.map((post) => {
          const href = getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic });
          const imageSrc = post.featuredImageUrl
            ? normalizePublicBlogImageUrl(post.featuredImageUrl)
            : "";

          return (
            <article className="blog-card" key={post.id}>
              <Link className="blog-card-image-link" href={href}>
                {imageSrc ? (
                  <img alt="" className="blog-card-image" src={imageSrc} />
                ) : (
                  <div className="blog-card-image blog-card-image-placeholder" />
                )}
              </Link>
              <div className="blog-card-body">
                {post.publishedAt ? (
                  <time className="blog-card-date" dateTime={post.publishedAt}>
                    {formatBlogPublishedDate(post.publishedAt)}
                  </time>
                ) : null}
                {post.primaryTopic || post.primaryCategory ? (
                  <div className="blog-card-meta">
                    {post.primaryTopic ? (
                      <Link
                        className="blog-chip"
                        href={getBlogTaxonomyFilterPath("topic", post.primaryTopic.slug)}
                      >
                        {post.primaryTopic.name}
                      </Link>
                    ) : null}
                    {post.primaryCategory ? (
                      <Link
                        className="blog-chip blog-chip-muted"
                        href={getBlogTaxonomyFilterPath("category", post.primaryCategory.slug)}
                      >
                        {post.primaryCategory.name}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                <Link className="blog-card-title-link" href={href}>
                  <h2 className="blog-card-title">{post.title}</h2>
                </Link>
                {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
              </div>
            </article>
          );
        })}
      </div>

      {posts.length === 0 ? <p className="blog-empty">No posts match these filters yet.</p> : null}

      {hasMore ? (
        <div className="blog-load-more-wrap">
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => void fetchPosts(offset, false, { topicSlug, categorySlug, tagSlug })}
            type="button"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
      </section>

      <BlogPostSidebar
        categories={categories}
        showRelatedPosts={false}
        tags={tags}
        topics={topics}
      />
    </div>
  );
}
