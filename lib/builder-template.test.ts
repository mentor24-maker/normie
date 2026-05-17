import { describe, expect, it } from "vitest";
import { formatRichTextContent, normalizeBuilderAssetUrl } from "@/lib/builder-template";

describe("formatRichTextContent", () => {
  it("wraps plain text in paragraphs", () => {
    const html = formatRichTextContent("Hello\n\nWorld");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("<p>World</p>");
  });

  it("escapes angle brackets in plain text", () => {
    const html = formatRichTextContent("3 < 5");
    expect(html).toContain("&lt;");
  });

  it("sanitizes stored html", () => {
    const html = formatRichTextContent("<p>Safe</p><img src=x onerror=alert(1) />");
    expect(html).toContain("Safe");
    expect(html.toLowerCase()).not.toContain("onerror");
  });
});

describe("normalizeBuilderAssetUrl", () => {
  it("rewrites legacy admin gallery paths to public gallery urls", () => {
    expect(normalizeBuilderAssetUrl("/api/admin/media-file/gallery/social-x.svg")).toBe(
      "/gallery/social-x.svg"
    );
  });

  it("strips localhost origin to a path", () => {
    expect(normalizeBuilderAssetUrl("http://localhost:3000/gallery/social-x.svg")).toBe(
      "/gallery/social-x.svg"
    );
  });
});
