"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatBlogPublishedDate,
  getBlogPostPath,
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
  topics: BlogTopicRecord[];
  categories: BlogCategoryRecord[];
  tags: BlogTagRecord[];
  initialTopicSlug: string;
  initialCategorySlug: string;
  initialTagSlug: string;
};

const PAGE_SIZE = 12;

export function BlogIndexClient({
  initialPosts,
  initialTotal,
  topics,
  categories,
  tags,
  initialTopicSlug,
  initialCategorySlug,
  initialTagSlug
}: BlogIndexClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialPosts.length);
  const [topicSlug, setTopicSlug] = useState(initialTopicSlug);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [tagSlug, setTagSlug] = useState(initialTagSlug);
  const [isLoading, setIsLoading] = useState(false);

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
    setTopicSlug(nextFilters.topicSlug);
    setCategorySlug(nextFilters.categorySlug);
    setTagSlug(nextFilters.tagSlug);
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
    window.history.replaceState(null, "", query ? `/blog?${query}` : "/blog");
    void fetchPosts(0, true, nextFilters);
  }

  const hasMore = offset < total;

  return (
    <section className="blog-index">
      <header className="blog-index-header">
        <p className="page-eyebrow">Normie Blog</p>
        <h1>Insights & stories</h1>
        <p className="page-copy">Explore ideas across identity, money, relationships, and modern life.</p>
      </header>

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
              <Link className="blog-card-link" href={href}>
                {imageSrc ? (
                  <img alt="" className="blog-card-image" src={imageSrc} />
                ) : (
                  <div className="blog-card-image blog-card-image-placeholder" />
                )}
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    {post.primaryTopic ? <span className="blog-chip">{post.primaryTopic.name}</span> : null}
                    {post.primaryCategory ? (
                      <span className="blog-chip blog-chip-muted">{post.primaryCategory.name}</span>
                    ) : null}
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt}>{formatBlogPublishedDate(post.publishedAt)}</time>
                    ) : null}
                  </div>
                  <h2>{post.title}</h2>
                  {post.tags.length > 0 ? (
                    <div className="blog-card-tags">
                      {post.tags.map((tag) => (
                        <span className="blog-chip blog-chip-muted" key={tag.id}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
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
  );
}
