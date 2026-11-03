import Link from "next/link";
import {
  getBlogPostPath,
  getBlogTaxonomyFilterPath,
  normalizePublicBlogImageUrl,
  type BlogCategoryRecord,
  type BlogPostCard,
  type BlogTagRecord,
  type BlogTopicRecord
} from "@/lib/blog";

type BlogPostSidebarProps = {
  relatedPosts?: BlogPostCard[];
  showRelatedPosts?: boolean;
  categories: BlogCategoryRecord[];
  topics: BlogTopicRecord[];
  tags: BlogTagRecord[];
};

function BlogSidebarRelatedItem({ post }: { post: BlogPostCard }) {
  const href = getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic });
  const imageSrc = post.featuredImageUrl ? normalizePublicBlogImageUrl(post.featuredImageUrl) : "";

  return (
    <li className="blog-sidebar-related-item">
      <Link className="blog-sidebar-related-link" href={href}>
        {imageSrc ? (
          <img alt="" className="blog-sidebar-related-thumb" src={imageSrc} />
        ) : (
          <span aria-hidden className="blog-sidebar-related-thumb blog-sidebar-related-thumb-placeholder" />
        )}
        <span className="blog-sidebar-related-title">{post.title}</span>
      </Link>
    </li>
  );
}

function BlogSidebarTaxonomyList({
  items,
  kind
}: {
  items: Array<{ id: string; name: string; slug: string }>;
  kind: "topic" | "category" | "tag";
}) {
  if (items.length === 0) {
    return <p className="blog-sidebar-empty">None yet.</p>;
  }

  return (
    <ul className="blog-sidebar-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={getBlogTaxonomyFilterPath(kind, item.slug)}>{item.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export function BlogPostSidebar({
  relatedPosts = [],
  showRelatedPosts = true,
  categories,
  topics,
  tags
}: BlogPostSidebarProps) {
  return (
    <aside aria-label="Blog sidebar" className="blog-post-sidebar">
      {showRelatedPosts ? (
        <section className="blog-sidebar-section">
          <h2 className="blog-sidebar-heading">Related Posts</h2>
          {relatedPosts.length > 0 ? (
            <ul className="blog-sidebar-related-list">
              {relatedPosts.map((post) => (
                <BlogSidebarRelatedItem key={post.id} post={post} />
              ))}
            </ul>
          ) : (
            <p className="blog-sidebar-empty">No related posts yet.</p>
          )}
        </section>
      ) : null}

      <section className="blog-sidebar-section">
        <h2 className="blog-sidebar-heading">Categories</h2>
        <BlogSidebarTaxonomyList items={categories} kind="category" />
      </section>

      <section className="blog-sidebar-section">
        <h2 className="blog-sidebar-heading">Topics</h2>
        <BlogSidebarTaxonomyList items={topics} kind="topic" />
      </section>

      <section className="blog-sidebar-section">
        <h2 className="blog-sidebar-heading">Tags</h2>
        <BlogSidebarTaxonomyList items={tags} kind="tag" />
      </section>
    </aside>
  );
}
