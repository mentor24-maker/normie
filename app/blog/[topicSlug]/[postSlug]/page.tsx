import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogFeaturedImageThumb } from "@/components/blog-featured-image-thumb";
import { BlogPostBody } from "@/components/blog-post-body";
import { BlogPostSidebar } from "@/components/blog-post-sidebar";
import { BlogShareButtons } from "@/components/blog-share-buttons";
import {
  buildBlogArticleJsonLd,
  formatBlogPublishedDate,
  resolveBlogSeo
} from "@/lib/blog";
import { getBlogSettingsCssVariables, getPublicBlogSettings } from "@/lib/blog-settings";
import {
  getPublicBlogPost,
  listPublicBlogSidebarRelatedPosts,
  listPublicBlogTopicsAndTags
} from "@/lib/blog-store";

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

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { topicSlug, postSlug } = await params;
  const result = await getPublicBlogPost(topicSlug, postSlug);

  if (!result) {
    notFound();
  }

  const { post } = result;
  const [taxonomy, sidebarRelated, blogSettings] = await Promise.all([
    listPublicBlogTopicsAndTags(),
    listPublicBlogSidebarRelatedPosts(post, 3),
    getPublicBlogSettings()
  ]);
  const seo = resolveBlogSeo(post);
  const jsonLd = buildBlogArticleJsonLd(post);

  return (
    <div className="blog-post-layout" style={getBlogSettingsCssVariables(blogSettings)}>
      <article className="blog-post-page">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
        <header className="blog-post-header">
          <Link className="blog-back-link" href="/blog">
            ← Back to blog
          </Link>
          {post.publishedAt ? (
            <time className="blog-card-date" dateTime={post.publishedAt}>
              {formatBlogPublishedDate(post.publishedAt)}
            </time>
          ) : null}
          {post.primaryTopic || post.primaryCategory || post.readingTimeMinutes > 0 ? (
            <div className="blog-post-meta">
              {post.primaryTopic ? <span className="blog-chip">{post.primaryTopic.name}</span> : null}
              {post.primaryCategory ? (
                <Link className="blog-chip blog-chip-muted" href={`/blog?category=${post.primaryCategory.slug}`}>
                  {post.primaryCategory.name}
                </Link>
              ) : null}
              {post.readingTimeMinutes > 0 ? <span>{post.readingTimeMinutes} min read</span> : null}
            </div>
          ) : null}
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-byline">By {post.authorName}</p>
          {post.excerpt ? <p className="page-copy blog-post-excerpt">{post.excerpt}</p> : null}
        </header>

        {post.featuredImageUrl ? (
          <BlogFeaturedImageThumb alt={post.title} imageUrl={post.featuredImageUrl} variant="detail" />
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
      </article>

      <BlogPostSidebar
        categories={taxonomy.categories}
        relatedPosts={sidebarRelated}
        tags={taxonomy.tags}
        topics={taxonomy.topics}
      />
    </div>
  );
}
