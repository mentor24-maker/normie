// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createBlogEditorExtensions } from "@/components/blog-editor-extensions";
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";

function buildEditor(content: string): Editor {
  return new Editor({ extensions: createBlogEditorExtensions(), content });
}

function findImagePos(editor: Editor): number {
  let imagePos = -1;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image") {
      imagePos = pos;
    }
  });

  return imagePos;
}

describe("blog editor links", () => {
  it("applies a link to selected text and survives the blog sanitizer", () => {
    const editor = buildEditor("<p>hello world</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });

    const applied = editor.chain().extendMarkRange("link").setLink({ href: "https://example.com" }).run();

    expect(applied).toBe(true);
    expect(sanitizeBlogBodyHtml(editor.getHTML())).toContain('href="https://example.com"');
  });

  it("applies a link to a selected image", () => {
    const editor = buildEditor('<p>before</p><img src="/gallery/photo.png" alt="">');
    const imagePos = findImagePos(editor);
    expect(imagePos).toBeGreaterThan(-1);
    editor.commands.setNodeSelection(imagePos);

    const applied = editor.chain().extendMarkRange("link").setLink({ href: "https://example.com" }).run();

    expect(applied).toBe(true);
    expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/example\.com"[^>]*><img/);
  });

  it("keeps a linked image through a content round trip", () => {
    const stored = '<p><a target="_blank" rel="noopener noreferrer" href="https://example.com"><img src="/gallery/photo.png" alt=""></a></p>';
    const editor = buildEditor(stored);

    expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/example\.com"[^>]*><img/);
    expect(sanitizeBlogBodyHtml(editor.getHTML())).toContain('href="https://example.com"');
  });

  it("still parses legacy top-level block images", () => {
    const editor = buildEditor('<p>text</p><img src="/gallery/photo.png" alt=""><p>more</p>');

    expect(editor.getHTML()).toContain('src="/gallery/photo.png"');
  });
});
