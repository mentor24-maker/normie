import type { MetadataRoute } from "next";
import { listPublicBlogPostPaths } from "@/lib/blog-store";
import { getSiteUrl } from "@/lib/site-url";

const staticRoutes = [
  "",
  "/about",
  "/blog",
  "/contact",
  "/roadmap",
  "/tokenomics",
  "/white-paper",
  "/privacy",
  "/terms"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/blog" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7
  }));

  let blogEntries: MetadataRoute.Sitemap = [];

  try {
    const paths = await listPublicBlogPostPaths();
    blogEntries = paths.map((entry) => ({
      url: `${siteUrl}/blog/${entry.topicSlug}/${entry.postSlug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6
    }));
  } catch {
    blogEntries = [];
  }

  return [...staticEntries, ...blogEntries];
}
