import {
  getBlogPostPath,
  isBlogPostPubliclyVisible,
  normalizePublicBlogImageUrl,
  resolveBlogSeo
} from "@/lib/blog";
import { listAdminBlogPosts } from "@/lib/blog-store";
import { getSiteUrl, toAbsoluteSiteUrl } from "@/lib/site-url";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const posts = (await listAdminBlogPosts()).filter((post) =>
    isBlogPostPubliclyVisible({ status: post.status, published_at: post.publishedAt ?? null })
  );

  const items = posts
    .map((post) => {
      const seo = resolveBlogSeo(post);
      const link = toAbsoluteSiteUrl(getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic ?? null }));
      const image = post.featuredImageUrl
        ? toAbsoluteSiteUrl(normalizePublicBlogImageUrl(post.featuredImageUrl))
        : "";

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(seo.description)}</description>
      <pubDate>${post.publishedAt ? new Date(post.publishedAt).toUTCString() : ""}</pubDate>
      ${image ? `<enclosure url="${escapeXml(image)}" type="image/jpeg" />` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Normie Blog</title>
    <link>${escapeXml(siteUrl)}/blog</link>
    <description>Insights on identity, money, relationships, and modern life.</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
    }
  });
}
