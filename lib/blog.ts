import { normalizeBuilderAssetUrl, safeText } from "@/lib/builder-template";
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";
import { toAbsoluteSiteUrl } from "@/lib/site-url";

export const BLOG_TOPIC_SEEDS = [
  { name: "Identity & Psychology", slug: "identity-psychology" },
  { name: "Money & Success", slug: "money-success" },
  { name: "Dark / Truth", slug: "dark-truth" },
  { name: "Social & Relationships", slug: "social-relationships" },
  { name: "Life Tradeoffs", slug: "life-tradeoffs" },
  { name: "Future / Power", slug: "future-power" },
  { name: "Self-Perception", slug: "self-perception" },
  { name: "Behavior & Habits", slug: "behavior-habits" },
  { name: "Modern Life / Digital", slug: "modern-life-digital" },
  { name: "Absurd but Revealing", slug: "absurd-but-revealing" }
] as const;

export type BlogPostStatus = "draft" | "scheduled" | "published";
export type BlogTwitterCardType = "summary" | "summary_large_image";

export type BlogTopicRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogTagRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  featuredImageUrl: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  authorTeamUserId: string | null;
  authorName: string;
  primaryTopicId: string | null;
  primaryCategoryId: string | null;
  topicIds: string[];
  categoryIds: string[];
  tagIds: string[];
  relatedPostIds: string[];
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCardType: BlogTwitterCardType;
  canonicalUrl: string;
  noindex: boolean;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  topics?: BlogTopicRecord[];
  categories?: BlogCategoryRecord[];
  tags?: BlogTagRecord[];
  primaryTopic?: BlogTopicRecord | null;
  primaryCategory?: BlogCategoryRecord | null;
};

export type BlogPostCard = Pick<
  BlogPostRecord,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "featuredImageUrl"
  | "publishedAt"
  | "readingTimeMinutes"
  | "authorName"
> & {
  primaryTopic: BlogTopicRecord | null;
  primaryCategory: BlogCategoryRecord | null;
  topics: BlogTopicRecord[];
  categories: BlogCategoryRecord[];
  tags: BlogTagRecord[];
};

export type BlogPostEditorInput = {
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  featuredImageUrl: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  authorTeamUserId: string | null;
  primaryTopicId: string | null;
  primaryCategoryId: string | null;
  topicIds: string[];
  categoryIds: string[];
  tagIds: string[];
  relatedPostIds: string[];
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCardType: BlogTwitterCardType;
  canonicalUrl: string;
  noindex: boolean;
};

/** Keeps hyphens while typing (does not trim leading/trailing dashes). */
export function normalizeBlogSlugInput(value: unknown, maxLength = 120) {
  return safeText(value, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, maxLength);
}

/** Final slug for save: lowercase, hyphenated, trimmed. */
export function slugifyBlogText(value: unknown, maxLength = 120) {
  return normalizeBlogSlugInput(value, maxLength)
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function normalizeBlogPostStatus(value: unknown): BlogPostStatus {
  const status = safeText(value, 20).toLowerCase();

  if (status === "published" || status === "scheduled") {
    return status;
  }

  return "draft";
}

export function normalizeBlogTwitterCardType(value: unknown): BlogTwitterCardType {
  return safeText(value, 40) === "summary" ? "summary" : "summary_large_image";
}

export function computeBlogReadingTimeMinutes(bodyHtml: string) {
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;

  return Math.max(1, Math.ceil(words / 200));
}

export function isBlogPostPubliclyVisible(row: { status: string; published_at: string | null }) {
  if (row.status !== "published" && row.status !== "scheduled") {
    return false;
  }

  if (!row.published_at) {
    return false;
  }

  return new Date(row.published_at).getTime() <= Date.now();
}

export function rowToBlogTopic(row: Record<string, unknown>): BlogTopicRecord {
  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    slug: safeText(row.slug, 120),
    createdAt: safeText(row.created_at ?? row.createdAt, 80),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 80)
  };
}

export function rowToBlogCategory(row: Record<string, unknown>): BlogCategoryRecord {
  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    slug: safeText(row.slug, 120),
    createdAt: safeText(row.created_at ?? row.createdAt, 80),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 80)
  };
}

export function rowToBlogTag(row: Record<string, unknown>): BlogTagRecord {
  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    slug: safeText(row.slug, 120),
    createdAt: safeText(row.created_at ?? row.createdAt, 80),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 80)
  };
}

export function rowToBlogPost(
  row: Record<string, unknown>,
  extras?: {
    topicIds?: string[];
    categoryIds?: string[];
    tagIds?: string[];
    relatedPostIds?: string[];
    topics?: BlogTopicRecord[];
    categories?: BlogCategoryRecord[];
    tags?: BlogTagRecord[];
    primaryTopic?: BlogTopicRecord | null;
    primaryCategory?: BlogCategoryRecord | null;
    authorName?: string;
  }
): BlogPostRecord {
  const primaryTopic =
    extras?.primaryTopic ??
    (Array.isArray(row.blog_topics) && row.blog_topics[0]
      ? rowToBlogTopic(row.blog_topics[0] as Record<string, unknown>)
      : null);
  const primaryCategory =
    extras?.primaryCategory ??
    (Array.isArray(row.blog_categories) && row.blog_categories[0]
      ? rowToBlogCategory(row.blog_categories[0] as Record<string, unknown>)
      : null);

  return {
    id: safeText(row.id, 120),
    title: safeText(row.title, 255),
    slug: safeText(row.slug, 120),
    excerpt: safeText(row.excerpt, 2000),
    bodyHtml: safeText(row.body_html ?? row.bodyHtml, 500000),
    featuredImageUrl: normalizeBuilderAssetUrl(row.featured_image_url ?? row.featuredImageUrl),
    status: normalizeBlogPostStatus(row.status),
    publishedAt: row.published_at ? safeText(row.published_at, 80) : null,
    authorTeamUserId: row.author_team_user_id ? safeText(row.author_team_user_id, 120) : null,
    authorName: extras?.authorName ?? (safeText(row.author_name, 255) || "Normie"),
    primaryTopicId: row.primary_topic_id ? safeText(row.primary_topic_id, 120) : primaryTopic?.id ?? null,
    primaryCategoryId: row.primary_category_id
      ? safeText(row.primary_category_id, 120)
      : primaryCategory?.id ?? null,
    topicIds: extras?.topicIds ?? [],
    categoryIds: extras?.categoryIds ?? [],
    tagIds: extras?.tagIds ?? [],
    relatedPostIds: extras?.relatedPostIds ?? [],
    metaTitle: safeText(row.meta_title ?? row.metaTitle, 255),
    metaDescription: safeText(row.meta_description ?? row.metaDescription, 500),
    ogTitle: safeText(row.og_title ?? row.ogTitle, 255),
    ogDescription: safeText(row.og_description ?? row.ogDescription, 500),
    ogImageUrl: normalizeBuilderAssetUrl(row.og_image_url ?? row.ogImageUrl),
    twitterCardType: normalizeBlogTwitterCardType(row.twitter_card_type ?? row.twitterCardType),
    canonicalUrl: safeText(row.canonical_url ?? row.canonicalUrl, 500),
    noindex: Boolean(row.noindex),
    readingTimeMinutes: Number(row.reading_time_minutes ?? row.readingTimeMinutes ?? 0) || 0,
    createdAt: safeText(row.created_at ?? row.createdAt, 80),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 80),
    topics: extras?.topics,
    categories: extras?.categories,
    tags: extras?.tags,
    primaryTopic,
    primaryCategory
  };
}

export function normalizeBlogPostEditorInput(body: Record<string, unknown>): BlogPostEditorInput {
  const title = safeText(body.title, 255);
  const slug = slugifyBlogText(body.slug || title, 120);
  const bodyHtml = sanitizeBlogBodyHtml(safeText(body.bodyHtml ?? body.body_html, 500000));
  const topicIds = Array.isArray(body.topicIds)
    ? body.topicIds.map((id) => safeText(id, 120)).filter(Boolean)
    : [];
  const primaryTopicId = safeText(body.primaryTopicId ?? body.primary_topic_id, 120) || null;
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.map((id) => safeText(id, 120)).filter(Boolean)
    : [];
  const primaryCategoryId = safeText(body.primaryCategoryId ?? body.primary_category_id, 120) || null;

  return {
    title,
    slug,
    excerpt: safeText(body.excerpt, 2000),
    bodyHtml,
    featuredImageUrl: normalizeBuilderAssetUrl(body.featuredImageUrl ?? body.featured_image_url),
    status: normalizeBlogPostStatus(body.status),
    publishedAt: safeText(body.publishedAt ?? body.published_at, 80) || null,
    authorTeamUserId: safeText(body.authorTeamUserId ?? body.author_team_user_id, 120) || null,
    primaryTopicId,
    primaryCategoryId,
    topicIds,
    categoryIds,
    tagIds: Array.isArray(body.tagIds)
      ? body.tagIds.map((id) => safeText(id, 120)).filter(Boolean)
      : [],
    relatedPostIds: Array.isArray(body.relatedPostIds)
      ? body.relatedPostIds.map((id) => safeText(id, 120)).filter(Boolean)
      : [],
    metaTitle: safeText(body.metaTitle ?? body.meta_title, 255),
    metaDescription: safeText(body.metaDescription ?? body.meta_description, 500),
    ogTitle: safeText(body.ogTitle ?? body.og_title, 255),
    ogDescription: safeText(body.ogDescription ?? body.og_description, 500),
    ogImageUrl: normalizeBuilderAssetUrl(body.ogImageUrl ?? body.og_image_url),
    twitterCardType: normalizeBlogTwitterCardType(body.twitterCardType ?? body.twitter_card_type),
    canonicalUrl: safeText(body.canonicalUrl ?? body.canonical_url, 500),
    noindex: Boolean(body.noindex)
  };
}

export function validateBlogPostInput(input: BlogPostEditorInput) {
  if (!input.title) {
    return "Title is required.";
  }

  if (!input.slug) {
    return "Slug is required.";
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    return "Slug must be lowercase and hyphenated.";
  }

  if (input.status !== "draft" && !input.primaryTopicId) {
    return "Primary topic is required before scheduling or publishing.";
  }

  if (input.primaryTopicId && !input.topicIds.includes(input.primaryTopicId)) {
    return "Primary topic must be included in the post topics list.";
  }

  if (input.primaryCategoryId && !input.categoryIds.includes(input.primaryCategoryId)) {
    return "Primary category must be included in the post categories list.";
  }

  if (input.status !== "draft" && !input.publishedAt) {
    return "Published date is required for scheduled or published posts.";
  }

  if ((input.status === "scheduled" || input.status === "published") && !input.bodyHtml.trim()) {
    return "Body content is required before scheduling or publishing.";
  }

  return null;
}

export function getBlogPostPath(post: { slug: string; primaryTopic?: { slug: string } | null }) {
  const topicSlug = post.primaryTopic?.slug;

  if (!topicSlug) {
    return `/blog/${post.slug}`;
  }

  return `/blog/${topicSlug}/${post.slug}`;
}

export function getBlogTaxonomyFilterPath(
  kind: "topic" | "category" | "tag",
  slug: string
) {
  const normalizedSlug = safeText(slug, 120);

  if (!normalizedSlug) {
    return "/blog";
  }

  const params = new URLSearchParams();
  params.set(kind, normalizedSlug);
  return `/blog?${params.toString()}`;
}

export function resolveBlogSeo(post: BlogPostRecord) {
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || post.title;
  const ogTitle = post.ogTitle || title;
  const ogDescription = post.ogDescription || description;
  const imagePath = post.ogImageUrl || post.featuredImageUrl;
  const imageUrl = imagePath ? toAbsoluteSiteUrl(normalizePublicBlogImageUrl(imagePath)) : "";
  const canonical =
    post.canonicalUrl ||
    toAbsoluteSiteUrl(getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic ?? null }));

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    imageUrl,
    canonical,
    twitterCardType: post.twitterCardType,
    noindex: post.noindex
  };
}

export function normalizePublicBlogImageUrl(path: string) {
  const normalized = normalizeBuilderAssetUrl(path);

  if (normalized.startsWith("/gallery/")) {
    return `/api/admin/media-file${normalized}`;
  }

  return normalized;
}

export function buildBlogArticleJsonLd(post: BlogPostRecord) {
  const seo = resolveBlogSeo(post);
  const url = seo.canonical;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: seo.description,
    image: seo.imageUrl ? [seo.imageUrl] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.authorName
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    }
  };
}

export function toBlogPostCard(post: BlogPostRecord): BlogPostCard {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featuredImageUrl: post.featuredImageUrl,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes,
    authorName: post.authorName,
    primaryTopic: post.primaryTopic ?? null,
    primaryCategory: post.primaryCategory ?? null,
    topics: post.topics ?? [],
    categories: post.categories ?? [],
    tags: post.tags ?? []
  };
}

export function formatBlogPublishedDate(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "";
  }
}
