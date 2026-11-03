import { describe, expect, it } from "vitest";
import {
  escapeHtmlText,
  sanitizeBlogBodyHtml,
  sanitizeEmbedHtml,
  sanitizeRichTextHtml,
  stripDangerousBlogBodyHtml
} from "@/lib/sanitize-html";

describe("escapeHtmlText", () => {
  it("escapes angle brackets and quotes", () => {
    expect(escapeHtmlText(`<script>"x"</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot;&lt;/script&gt;"
    );
  });
});

describe("sanitizeRichTextHtml", () => {
  it("strips script tags", () => {
    const clean = sanitizeRichTextHtml('<p>Hello</p><script>alert("x")</script>');
    expect(clean).toContain("<p>Hello</p>");
    expect(clean.toLowerCase()).not.toContain("<script");
  });

  it("keeps basic formatting tags", () => {
    const clean = sanitizeRichTextHtml("<p><strong>Bold</strong></p>");
    expect(clean).toContain("<strong>Bold</strong>");
  });

  it("keeps gallery images with safe src", () => {
    const clean = sanitizeRichTextHtml('<p>Hi</p><img src="/gallery/test.png" alt="Normie" />');
    expect(clean.toLowerCase()).toContain("<img");
    expect(clean).toContain("/gallery/test.png");
  });

  it("strips images with unsafe src", () => {
    const clean = sanitizeRichTextHtml('<img src="javascript:alert(1)" alt="x" />');
    expect(clean.toLowerCase()).not.toContain("<img");
  });
});

describe("sanitizeBlogBodyHtml", () => {
  it("strips script tags from blog body html", () => {
    const clean = sanitizeBlogBodyHtml('<p>Hello</p><script>alert("x")</script>');
    expect(clean).toContain("<p>Hello</p>");
    expect(clean.toLowerCase()).not.toContain("<script");
  });

  it("keeps trusted video embeds", () => {
    const youtube = sanitizeBlogBodyHtml(
      '<div class="blog-embed"><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe></div>'
    );
    const vimeo = sanitizeBlogBodyHtml(
      '<div class="blog-embed"><iframe src="https://player.vimeo.com/video/123"></iframe></div>'
    );

    expect(youtube).toContain("youtube-nocookie.com/embed/abc");
    expect(vimeo).toContain("player.vimeo.com/video/123");
  });

  it("removes iframes from untrusted origins", () => {
    const clean = sanitizeBlogBodyHtml('<p>a</p><iframe src="https://evil.example.com/x"></iframe>');

    expect(clean).toContain("<p>a</p>");
    expect(clean.toLowerCase()).not.toContain("<iframe");
  });

  it("keeps gallery videos and forces playback controls", () => {
    const clean = sanitizeBlogBodyHtml('<div class="blog-embed"><video src="/gallery/clips/intro.mp4"></video></div>');

    expect(clean).toContain('src="/gallery/clips/intro.mp4"');
    expect(clean).toContain("controls");
    expect(clean).toContain('preload="metadata"');
  });

  it("rewrites admin-only image sources to the public gallery route", () => {
    const clean = sanitizeBlogBodyHtml(
      '<p><img src="/api/admin/media-file/gallery/photos/hero.png" alt="Hero" class="rich-text-editor-image" /></p>'
    );

    expect(clean).toContain('src="/gallery/photos/hero.png"');
    expect(clean).not.toContain("/api/admin/media-file/");
    expect(clean).toContain('alt="Hero"');
  });

  it("leaves already-public image sources untouched", () => {
    const clean = sanitizeBlogBodyHtml('<p><img src="/gallery/photos/hero.png" alt="" class="rich-text-editor-image" /></p>');

    expect(clean).toContain('src="/gallery/photos/hero.png"');
  });

  it("removes video elements pointing outside the gallery", () => {
    const clean = sanitizeBlogBodyHtml('<p>a</p><video src="https://evil.example.com/clip.mp4"></video>');

    expect(clean).toContain("<p>a</p>");
    expect(clean.toLowerCase()).not.toContain("<video");
  });

  it("overwrites an author-supplied iframe sandbox", () => {
    const clean = sanitizeBlogBodyHtml(
      '<div class="blog-embed"><iframe src="https://player.vimeo.com/video/123" sandbox="allow-top-navigation"></iframe></div>'
    );

    expect(clean).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
    expect(clean).not.toContain("allow-top-navigation");
  });

  it("adds loading=lazy to images, which Tiptap never emits", () => {
    const tiptapHtml = '<p>Hi</p><img class="rich-text-image" src="/gallery/test.png" alt="">';
    const clean = sanitizeBlogBodyHtml(tiptapHtml);

    expect(clean).toContain('loading="lazy"');
    // The gap that makes a raw getHTML() comparison in the editor's value-sync
    // effect permanently unequal once a body holds an image.
    expect(clean).not.toBe(tiptapHtml);
  });

  it("is idempotent, so the editor can compare sanitized-to-sanitized", () => {
    const samples = [
      '<p>Hi</p><img class="rich-text-image" src="/gallery/test.png" alt="">',
      '<p><a href="https://example.com">Link</a></p>',
      '<p>Before</p><img src="/gallery/a.png" alt="" loading="lazy"><p>After</p>',
      '<p><img src="/api/admin/media-file/gallery/photos/hero.png" alt="Hero" /></p>',
      '<div class="blog-embed"><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe></div>',
      '<div class="blog-embed"><video src="/gallery/clips/intro.mp4"></video></div>',
      "<p></p>"
    ];

    for (const sample of samples) {
      const once = sanitizeBlogBodyHtml(sample);
      expect(sanitizeBlogBodyHtml(once)).toBe(once);
    }
  });
});

describe("stripDangerousBlogBodyHtml", () => {
  it("removes scripts and inline handlers", () => {
    const clean = stripDangerousBlogBodyHtml('<p onclick="x()">Hi</p><script>bad()</script>');
    expect(clean).toContain("<p");
    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean).not.toContain("onclick");
  });

  it("applies the same embed allowlist as the DOMPurify path", () => {
    const clean = stripDangerousBlogBodyHtml(
      '<iframe title="ok" src="https://player.vimeo.com/video/123"></iframe>' +
        '<iframe src="https://evil.example.com/x"></iframe>' +
        '<video src="/gallery/clips/intro.mp4"></video>' +
        '<video src="https://evil.example.com/clip.mp4"></video>'
    );

    expect(clean).toContain("player.vimeo.com/video/123");
    expect(clean).toContain("/gallery/clips/intro.mp4");
    expect(clean).not.toContain("evil.example.com");
  });

  it("also rewrites admin-only image sources on the fallback path", () => {
    const clean = stripDangerousBlogBodyHtml(
      '<img src="/api/admin/media-file/gallery/photos/hero.png" class="rich-text-editor-image" />'
    );

    expect(clean).toContain('src="/gallery/photos/hero.png"');
    expect(clean).not.toContain("/api/admin/media-file/");
  });
});

describe("sanitizeEmbedHtml", () => {
  it("allows iframes but removes scripts", () => {
    const clean = sanitizeEmbedHtml(
      '<iframe src="https://example.com/embed"></iframe><script>alert(1)</script>'
    );
    expect(clean.toLowerCase()).toContain("<iframe");
    expect(clean.toLowerCase()).not.toContain("<script");
  });

  it("strips style tags but keeps dexscreener embed markup", () => {
    const clean = sanitizeEmbedHtml(
      '<style>#dexscreener-embed{width:100%;}</style><motion.div id="dexscreener-embed"><iframe src="https://dexscreener.com/solana/test?embed=1"></iframe></div>'.replace(
        /motion\./g,
        ""
      )
    );
    expect(clean.toLowerCase()).not.toContain("<style");
    expect(clean).toContain('id="dexscreener-embed"');
    expect(clean.toLowerCase()).toContain("<iframe");
  });
});
