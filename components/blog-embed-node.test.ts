// @vitest-environment jsdom
import { getSchema } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { DOMParser as ProseMirrorDOMParser, DOMSerializer, type Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { BlogEmbed } from "@/components/blog-embed-node";
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";

/** Mirrors the extension set in `components/blog-rich-text-editor.tsx`. */
function buildBlogSchema(): Schema {
  return getSchema([
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    Image.configure({}),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    BlogEmbed
  ]);
}

/** Parse HTML into the schema and serialize it back, exactly as `setContent` + `getHTML()` do. */
function roundTrip(schema: Schema, html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;

  const doc = ProseMirrorDOMParser.fromSchema(schema).parse(container);
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document });
  const output = document.createElement("div");
  output.appendChild(fragment);

  return output.innerHTML;
}

describe("BlogEmbed node", () => {
  it("survives a parse/serialize round trip instead of being dropped by the schema", () => {
    const schema = buildBlogSchema();
    const stored =
      '<p>before</p><div class="blog-embed"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></div><p>after</p>';

    const html = roundTrip(schema, stored);

    expect(html).toContain('<div class="blog-embed">');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>after</p>");
  });

  it("keeps a gallery video embed stable across round trips", () => {
    const schema = buildBlogSchema();
    const stored = '<div class="blog-embed"><video src="/gallery/clips/intro.mp4"></video></div>';

    const once = roundTrip(schema, stored);
    const twice = roundTrip(schema, once);

    expect(once).toContain('<video src="/gallery/clips/intro.mp4"');
    expect(once).toContain("controls");
    expect(twice).toBe(once);
  });

  it("drops an embed wrapper whose src is not a trusted provider", () => {
    const schema = buildBlogSchema();
    const stored = '<p>a</p><div class="blog-embed"><iframe src="https://evil.example.com/x"></iframe></div><p>b</p>';

    const html = roundTrip(schema, stored);

    expect(html).not.toContain("blog-embed");
    expect(html).not.toContain("evil.example.com");
  });

  it("recovers a post that the old button filled with visible embed text", () => {
    const schema = buildBlogSchema();
    const stored =
      '<p>Their questions are different:</p><p>&lt;div class="blog-embed"&gt;&lt;iframe ' +
      'src="https://www.youtube-nocookie.com/embed/JXZum_n5Uss" title="youtube embed" loading="lazy" ' +
      'allowfullscreen&gt;&lt;/iframe&gt;&lt;/div&gt;</p><h2>The Wisdom of the Quiet Strategist</h2>';

    const html = roundTrip(schema, sanitizeBlogBodyHtml(stored));

    expect(html).toContain('<div class="blog-embed"><iframe');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/JXZum_n5Uss"');
    expect(html).not.toContain("&lt;iframe");
    expect(html).toContain("<p>Their questions are different:</p>");
    expect(html).toContain("<h2>The Wisdom of the Quiet Strategist</h2>");
  });

  it("normalizes a watch URL to the nocookie embed on insert", () => {
    const schema = buildBlogSchema();
    const node = schema.nodes.blogEmbed.create({ src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
      schema.topNodeType.create(null, node).content,
      { document }
    );
    const output = document.createElement("div");
    output.appendChild(fragment);

    expect(output.innerHTML).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });
});
