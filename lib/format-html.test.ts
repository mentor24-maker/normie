import { describe, expect, it } from "vitest";
import { formatHtmlForCodeView } from "@/lib/format-html";

describe("formatHtmlForCodeView", () => {
  it("puts each block element on its own line", () => {
    const html = formatHtmlForCodeView("<h2>Title</h2><p>alpha</p><p>bravo</p>");

    expect(html).toBe("<h2>Title</h2>\n<p>alpha</p>\n<p>bravo</p>");
  });

  it("indents nested block elements", () => {
    const html = formatHtmlForCodeView("<ul><li><p>one</p></li><li><p>two</p></li></ul>");

    expect(html).toBe(
      "<ul>\n  <li>\n    <p>one</p>\n  </li>\n  <li>\n    <p>two</p>\n  </li>\n</ul>"
    );
  });

  it("keeps runs of inline elements on one line", () => {
    const html = formatHtmlForCodeView("<p><strong>bold</strong><em>italic</em></p>");

    expect(html).toBe("<p><strong>bold</strong><em>italic</em></p>");
  });

  it("keeps an embed readable without splitting empty elements", () => {
    const html = formatHtmlForCodeView(
      '<div class="blog-embed"><iframe src="https://player.vimeo.com/video/123"></iframe></div>'
    );

    expect(html).toBe(
      '<div class="blog-embed">\n  <iframe src="https://player.vimeo.com/video/123"></iframe>\n</div>'
    );
  });

  it("leaves whitespace inside pre blocks untouched", () => {
    const source = "<p>before</p><pre><code>const a = 1;\n  const b = 2;\n</code></pre><p>after</p>";
    const html = formatHtmlForCodeView(source);

    expect(html).toContain("<pre><code>const a = 1;\n  const b = 2;\n</code></pre>");
    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>after</p>");
  });

  it("is stable when applied twice", () => {
    const source = '<h2>Title</h2><ul><li><p>one</p></li></ul><div class="blog-embed"><iframe src="https://player.vimeo.com/video/123"></iframe></div>';
    const once = formatHtmlForCodeView(source);

    expect(formatHtmlForCodeView(once)).toBe(once);
  });

  it("handles empty input", () => {
    expect(formatHtmlForCodeView("")).toBe("");
    expect(formatHtmlForCodeView("   ")).toBe("");
  });
});
