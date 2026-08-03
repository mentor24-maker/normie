// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { BlogEmbed } from "@/components/blog-embed-node";
import { formatHtmlForCodeView } from "@/lib/format-html";
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";

/** Mirrors the extension set in `components/blog-rich-text-editor.tsx`. */
function parseToHtml(content: string) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: "rich-text-editor-image blog-editor-image" } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      BlogEmbed
    ],
    content
  });

  const html = editor.getHTML();
  editor.destroy();

  return html;
}

const SAMPLES: Array<[string, string]> = [
  ["paragraphs", "<p>alpha</p><p>bravo</p>"],
  ["inline marks", "<p>Instead of <strong>speaking</strong><em>first</em>, they listen.</p>"],
  ["headings and lists", "<h2>Their questions are different:</h2><ul><li><p>What is everyone missing?</p></li><li><p>What is the smartest move?</p></li></ul>"],
  [
    "embed",
    '<p>before</p><div class="blog-embed"><iframe src="https://www.youtube-nocookie.com/embed/JXZum_n5Uss"></iframe></div><p>after</p>'
  ],
  ["image", '<p>copy</p><img class="rich-text-editor-image blog-editor-image" src="/gallery/photos/hero.png" alt="">'],
  ["code block", "<p>before</p><pre><code>const a = 1;\n  const b = 2;</code></pre><p>after</p>"],
  ["blockquote", "<blockquote><p>quoted line</p></blockquote><p>after</p>"]
];

describe("HTML code view formatting", () => {
  it.each(SAMPLES)("round trips %s without changing the document", (_label, source) => {
    const direct = parseToHtml(sanitizeBlogBodyHtml(source));
    const viaCodeView = parseToHtml(sanitizeBlogBodyHtml(formatHtmlForCodeView(parseToHtml(source))));

    expect(viaCodeView).toBe(direct);
  });

  it("does not gain whitespace when toggled repeatedly", () => {
    const source = "<p>before</p><pre><code>const a = 1;</code></pre><p><strong>bold</strong><em>italic</em></p>";

    let current = parseToHtml(source);

    for (let pass = 0; pass < 3; pass += 1) {
      current = parseToHtml(sanitizeBlogBodyHtml(formatHtmlForCodeView(current)));
    }

    expect(current).toBe(parseToHtml(source));
  });
});
