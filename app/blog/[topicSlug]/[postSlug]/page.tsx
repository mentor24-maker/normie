import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogPostBody } from "@/components/blog-post-body";
import { BlogShareButtons } from "@/components/blog-share-buttons";
import {
  buildBlogArticleJsonLd,
  formatBlogPublishedDate,
  getBlogPostPath,
  normalizePublicBlogImageUrl,
  resolveBlogSeo,
  type BlogPostCard
} from "@/lib/blog";
import { getPublicBlogPost } from "@/lib/blog-store";
type BlogPostPageProps = {
  params: Promise<{
    topicSlug: string;
    postSlug: string;
  }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { topicSlug, postSlug } = await params;
  const result = await getPublicBlogPost(topicSlug, postSlug);

  if (!result) {
    return { title: "Post not found | Normie Blog" };
  }

  const seo = resolveBlogSeo(result.post);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonical,
      type: "article",
      publishedTime: result.post.publishedAt ?? undefined,
      images: seo.imageUrl ? [{ url: seo.imageUrl, alt: result.post.title }] : undefined
    },
    twitter: {
      card: seo.twitterCardType,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: seo.imageUrl ? [seo.imageUrl] : undefined
    }
  };
}

function RelatedPostCard({ post }: { post: BlogPostCard }) {
  const href = getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic });
  const imageSrc = post.featuredImageUrl ? normalizePublicBlogImageUrl(post.featuredImageUrl) : "";

  return (
    <article className="blog-related-card">
      <Link href={href}>
        {imageSrc ? <img alt="" className="blog-related-image" src={imageSrc} /> : null}
        <h3>{post.title}</h3>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
      </Link>
    </article>
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { topicSlug, postSlug } = await params;
  const result = await getPublicBlogPost(topicSlug, postSlug);

  if (!result) {
    notFound();
  }

  const { post, related } = result;
  const seo = resolveBlogSeo(post);
  const jsonLd = buildBlogArticleJsonLd(post);
  const featuredImage = post.featuredImageUrl ? normalizePublicBlogImageUrl(post.featuredImageUrl) : "";

  return (
      <article className="blog-post-page">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
        <header className="blog-post-header">
          <Link className="blog-back-link" href="/blog">
            ← Back to blog
          </Link>
          <div className="blog-post-meta">
            {post.primaryTopic ? <span className="blog-chip">{post.primaryTopic.name}</span> : null}
            {post.primaryCategory ? (
              <Link className="blog-chip blog-chip-muted" href={`/blog?category=${post.primaryCategory.slug}`}>
                {post.primaryCategory.name}
              </Link>
            ) : null}
            {post.publishedAt ? (
              <time dateTime={post.publishedAt}>{formatBlogPublishedDate(post.publishedAt)}</time>
            ) : null}
            {post.readingTimeMinutes > 0 ? <span>{post.readingTimeMinutes} min read</span> : null}
          </div>
          <h1>{post.title}</h1>
          <p className="blog-post-byline">By {post.authorName}</p>
          {post.excerpt ? <p className="page-copy blog-post-excerpt">{post.excerpt}</p> : null}
        </header>

        {featuredImage ? (
          <img alt="" className="blog-post-featured-image" src={featuredImage} />
        ) : null}

        <BlogPostBody html={post.bodyHtml} />

        {(post.tags ?? []).length > 0 ? (
          <div className="blog-post-tags">
            {(post.tags ?? []).map((tag) => (
              <Link className="blog-chip blog-chip-muted" href={`/blog?tag=${tag.slug}`} key={tag.id}>
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        <BlogShareButtons title={post.title} url={seo.canonical} />

        {related.length > 0 ? (
          <section className="blog-related">
            <h2>Related posts</h2>
            <div className="blog-related-grid">
              {related.map((relatedPost) => (
                <RelatedPostCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
  );
}
