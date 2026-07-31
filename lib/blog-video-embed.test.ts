import { describe, expect, it } from "vitest";
import { isAllowedBlogVideoFileSrc, resolveBlogEmbedSource } from "@/lib/blog-video-embed";

describe("resolveBlogEmbedSource", () => {
  it("resolves every YouTube URL shape to a nocookie embed", () => {
    const expected = { kind: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" };

    expect(resolveBlogEmbedSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual(expected);
    expect(resolveBlogEmbedSource("https://youtu.be/dQw4w9WgXcQ")).toEqual(expected);
    expect(resolveBlogEmbedSource("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toEqual(expected);
    expect(resolveBlogEmbedSource("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")).toEqual(expected);
  });

  it("resolves Vimeo URLs, including unlisted privacy hashes", () => {
    expect(resolveBlogEmbedSource("https://vimeo.com/123456789")).toEqual({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789"
    });
    expect(resolveBlogEmbedSource("https://vimeo.com/123456789/abc123")).toEqual({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789?h=abc123"
    });
  });

  it("resolves X and Twitter post URLs to the platform embed", () => {
    const expected = {
      kind: "iframe",
      src: "https://platform.twitter.com/embed/Tweet.html?dnt=true&id=1234567890"
    };

    expect(resolveBlogEmbedSource("https://x.com/normie/status/1234567890")).toEqual(expected);
    expect(resolveBlogEmbedSource("https://twitter.com/normie/status/1234567890?s=20")).toEqual(expected);
  });

  it("resolves gallery-hosted video files to a public /gallery src", () => {
    expect(resolveBlogEmbedSource("/gallery/clips/intro.mp4")).toEqual({
      kind: "video",
      src: "/gallery/clips/intro.mp4"
    });
    expect(resolveBlogEmbedSource("/api/admin/media-file/gallery/clips/intro.webm")).toEqual({
      kind: "video",
      src: "/gallery/clips/intro.webm"
    });
  });

  it("is idempotent so stored HTML survives an editor round trip", () => {
    for (const input of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/123456789/abc123",
      "https://x.com/normie/status/1234567890",
      "/gallery/clips/intro.mp4"
    ]) {
      const first = resolveBlogEmbedSource(input);
      expect(first).not.toBeNull();
      expect(resolveBlogEmbedSource(first!.src)).toEqual(first);
    }
  });

  it("rejects untrusted origins, non-video gallery files, and junk", () => {
    expect(resolveBlogEmbedSource("https://evil.example.com/embed/1")).toBeNull();
    expect(resolveBlogEmbedSource("javascript:alert(1)")).toBeNull();
    expect(resolveBlogEmbedSource("https://evil.example.com/clip.mp4")).toBeNull();
    expect(resolveBlogEmbedSource("/gallery/photos/hero.png")).toBeNull();
    expect(resolveBlogEmbedSource("https://www.youtube.com/watch")).toBeNull();
    expect(resolveBlogEmbedSource("https://x.com/normie")).toBeNull();
    expect(resolveBlogEmbedSource("")).toBeNull();
  });
});

describe("isAllowedBlogVideoFileSrc", () => {
  it("accepts gallery video files only", () => {
    expect(isAllowedBlogVideoFileSrc("/gallery/clips/intro.mp4")).toBe(true);
    expect(isAllowedBlogVideoFileSrc("/gallery/photos/hero.png")).toBe(false);
    expect(isAllowedBlogVideoFileSrc("https://evil.example.com/clip.mp4")).toBe(false);
    expect(isAllowedBlogVideoFileSrc("")).toBe(false);
  });
});
