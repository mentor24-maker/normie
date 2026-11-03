import { describe, expect, it } from "vitest";
import { normalizeRichTextLinkUrl } from "@/lib/rich-text-link-url";

describe("normalizeRichTextLinkUrl", () => {
  it("returns null for blank input and the untouched prompt defaults", () => {
    expect(normalizeRichTextLinkUrl("")).toBeNull();
    expect(normalizeRichTextLinkUrl("   ")).toBeNull();
    expect(normalizeRichTextLinkUrl("https://")).toBeNull();
    expect(normalizeRichTextLinkUrl("http://")).toBeNull();
  });

  it("keeps URLs that already have a scheme", () => {
    expect(normalizeRichTextLinkUrl("https://normie.one/blog")).toBe("https://normie.one/blog");
    expect(normalizeRichTextLinkUrl("mailto:hi@normie.one")).toBe("mailto:hi@normie.one");
    expect(normalizeRichTextLinkUrl("tel:+15551234567")).toBe("tel:+15551234567");
  });

  it("keeps relative paths and anchors", () => {
    expect(normalizeRichTextLinkUrl("/portal/dashboard")).toBe("/portal/dashboard");
    expect(normalizeRichTextLinkUrl("#section")).toBe("#section");
    expect(normalizeRichTextLinkUrl("?page=2")).toBe("?page=2");
  });

  it("prefixes https:// on bare domains so they do not resolve as relative paths", () => {
    expect(normalizeRichTextLinkUrl("normie.one")).toBe("https://normie.one");
    expect(normalizeRichTextLinkUrl("www.example.com/path")).toBe("https://www.example.com/path");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeRichTextLinkUrl("  example.com  ")).toBe("https://example.com");
  });
});
