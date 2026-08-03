// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createBuilderEditorExtensions } from "@/components/builder-editor-extensions";
import { prepareRichTextHtmlForStorage } from "@/lib/builder-template";

function buildEditor(content: string): Editor {
  return new Editor({ extensions: createBuilderEditorExtensions(), content });
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

describe("builder editor links", () => {
  it("applies a link to selected text and survives the storage sanitizer", () => {
    const editor = buildEditor("<p>hello world</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });

    const applied = editor.chain().extendMarkRange("link").setLink({ href: "https://example.com" }).run();

    expect(applied).toBe(true);
    expect(prepareRichTextHtmlForStorage(editor.getHTML())).toContain('href="https://example.com"');
  });

  it("applies a link to a selected image", () => {
    const editor = buildEditor('<p>before</p><p><img src="/gallery/photo.png" alt=""></p>');
    const imagePos = findImagePos(editor);
    expect(imagePos).toBeGreaterThan(-1);
    editor.commands.setNodeSelection(imagePos);

    const applied = editor.chain().extendMarkRange("link").setLink({ href: "https://example.com" }).run();

    expect(applied).toBe(true);
    expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/example\.com"[^>]*><img/);
  });

  it("keeps a linked image through the storage round trip", () => {
    const stored = '<p><a target="_blank" rel="noopener noreferrer" href="https://example.com"><img src="/gallery/photo.png" alt=""></a></p>';
    const editor = buildEditor(stored);

    expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/example\.com"[^>]*><img/);
    expect(prepareRichTextHtmlForStorage(editor.getHTML())).toContain('href="https://example.com"');
  });

  it("still parses legacy top-level block images", () => {
    const editor = buildEditor('<p>text</p><img src="/gallery/photo.png" alt=""><p>more</p>');

    expect(editor.getHTML()).toContain('src="/gallery/photo.png"');
  });
});
