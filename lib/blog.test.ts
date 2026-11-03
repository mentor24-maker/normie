import { describe, expect, it } from "vitest";
import {
  normalizeBlogSlugInput,
  normalizePublicBlogImageUrl,
  resolveBlogFeaturedImageAdminSrc,
  slugifyBlogText,
  validateBlogPostInput
} from "@/lib/blog";

describe("blog featured image urls", () => {
  it("maps gallery paths to public and admin URLs", () => {
    expect(normalizePublicBlogImageUrl("/gallery/normie.png")).toBe("/gallery/normie.png");
    expect(resolveBlogFeaturedImageAdminSrc("/gallery/normie.png")).toBe(
      "/api/admin/media-file/gallery/normie.png"
    );
  });
});

describe("normalizeBlogSlugInput", () => {
  it("preserves dashes while typing", () => {
    expect(normalizeBlogSlugInput("my-new-post-")).toBe("my-new-post-");
  });

  it("lowercases and hyphenates words", () => {
    expect(normalizeBlogSlugInput("Identity & Psychology")).toBe("identity-psychology");
  });
});

describe("slugifyBlogText", () => {
  it("trims edge dashes on save", () => {
    expect(slugifyBlogText("my-new-post-")).toBe("my-new-post");
  });
});

describe("validateBlogPostInput", () => {
  it("requires primary topic when publishing", () => {
    const error = validateBlogPostInput({
      title: "Hello",
      slug: "hello",
      excerpt: "",
      bodyHtml: "<p>Hi</p>",
      featuredImageUrl: "",
      status: "published",
      publishedAt: new Date().toISOString(),
      authorTeamUserId: null,
      primaryTopicId: null,
      primaryCategoryId: null,
      topicIds: [],
      categoryIds: [],
      tagIds: [],
      relatedPostIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: "",
      twitterCardType: "summary_large_image",
      canonicalUrl: "",
      noindex: false
    });

    expect(error).toMatch(/primary topic/i);
  });

  it("requires primary category to be in category list", () => {
    const error = validateBlogPostInput({
      title: "Hello",
      slug: "hello",
      excerpt: "",
      bodyHtml: "<p>Hi</p>",
      featuredImageUrl: "",
      status: "draft",
      publishedAt: null,
      authorTeamUserId: null,
      primaryTopicId: null,
      primaryCategoryId: "cat-1",
      topicIds: [],
      categoryIds: [],
      tagIds: [],
      relatedPostIds: [],
      metaTitle: "",
      metaDescription: "",
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: "",
      twitterCardType: "summary_large_image",
      canonicalUrl: "",
      noindex: false
    });

    expect(error).toMatch(/primary category/i);
  });
});
