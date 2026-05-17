import { describe, expect, it } from "vitest";
import { normalizeBlogSlugInput, slugifyBlogText, validateBlogPostInput } from "@/lib/blog";

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
      topicIds: [],
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
});
