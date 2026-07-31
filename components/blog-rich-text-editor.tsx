"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { BlogEmbed } from "@/components/blog-embed-node";
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";
import { RICH_TEXT_IMAGE_CLASS, resolveRichTextImageSrc } from "@/lib/rich-text-image";

type BlogRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onOpenGallery: () => void;
  /**
   * Enables the Video and Embed controls. Omit for callers that persist through
   * `sanitizeRichTextHtml` (e.g. poll pods) — that allowlist has no iframe or video, so embeds
   * would be silently dropped on save.
   */
  onOpenVideoGallery?: () => void;
  galleryImagePath?: string | null;
  onGalleryImageConsumed?: () => void;
  galleryVideoPath?: string | null;
  onGalleryVideoConsumed?: () => void;
  placeholder?: string;
};

export function BlogRichTextEditor({
  value,
  onChange,
  onOpenGallery,
  onOpenVideoGallery,
  galleryImagePath,
  onGalleryImageConsumed,
  galleryVideoPath,
  onGalleryVideoConsumed,
  placeholder = "Write your post"
}: BlogRichTextEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false);
  const [codeViewValue, setCodeViewValue] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
      }),
      Image.configure({ HTMLAttributes: { class: `${RICH_TEXT_IMAGE_CLASS} blog-editor-image` } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      BlogEmbed
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeBlogBodyHtml(currentEditor.getHTML()));
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalized = sanitizeBlogBodyHtml(value) || "<p></p>";

    // Compare sanitized-to-sanitized. The sanitizer stamps loading="lazy" onto
    // every image and Tiptap's Image node does not model that attribute, so a
    // raw getHTML() comparison is permanently unequal once the body holds an
    // image — and the setContent it then fires on every edit replaces the doc
    // and throws the caret to the end, so the next insert lands at the bottom.
    if (sanitizeBlogBodyHtml(editor.getHTML()) !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !galleryImagePath) {
      return;
    }

    // "display" (not "editor") so the stored `/gallery/...` src also resolves for public readers —
    // `/api/admin/media-file/...` is admin-only and 401s on the live post.
    const src = resolveRichTextImageSrc(galleryImagePath, "display");

    if (!src) {
      onGalleryImageConsumed?.();
      return;
    }

    editor.chain().focus().setImage({ src, alt: "" }).run();
    onGalleryImageConsumed?.();
  }, [editor, galleryImagePath, onGalleryImageConsumed]);

  useEffect(() => {
    if (!editor || !galleryVideoPath) {
      return;
    }

    if (!editor.chain().focus().setBlogEmbed(galleryVideoPath).run()) {
      window.alert("That gallery file is not a supported video (mp4, mov, m4v, webm, ogg).");
    }

    onGalleryVideoConsumed?.();
  }, [editor, galleryVideoPath, onGalleryVideoConsumed]);

  function setLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl || "https://");

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertEmbed() {
    if (!editor) {
      return;
    }

    const url = window.prompt("YouTube, Vimeo, or X post URL");

    if (!url) {
      return;
    }

    if (!editor.chain().focus().setBlogEmbed(url.trim()).run()) {
      window.alert("Could not build an embed for that URL.");
    }
  }

  if (!editor) {
    return (
      <div className="blog-rich-text-shell">
        <div className="blog-rich-text-loading">{placeholder}</div>
      </div>
    );
  }

  if (isCodeView) {
    return (
      <div className="blog-rich-text-shell">
        <div className="blog-rich-text-toolbar">
          <button className="is-active" onClick={() => {
            editor.commands.setContent(sanitizeBlogBodyHtml(codeViewValue), { emitUpdate: true });
            setIsCodeView(false);
          }} type="button">
            Visual
          </button>
        </div>
        <textarea
          className="blog-rich-text-code"
          value={codeViewValue}
          onChange={(event) => setCodeViewValue(event.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="blog-rich-text-shell">
      <div className="blog-rich-text-toolbar">
        <button
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          H2
        </button>
        <button
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          type="button"
        >
          H3
        </button>
        <button
          className={editor.isActive("heading", { level: 4 }) ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          type="button"
        >
          H4
        </button>
        <button
          className={editor.isActive("bold") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          className={editor.isActive("italic") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          <em>I</em>
        </button>
        <button
          className={editor.isActive("underline") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          type="button"
        >
          U
        </button>
        <button
          className={editor.isActive("bulletList") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
        >
          • List
        </button>
        <button
          className={editor.isActive("orderedList") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          1. List
        </button>
        <button
          className={editor.isActive("blockquote") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          type="button"
        >
          Quote
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button">
          HR
        </button>
        <button
          className={editor.isActive("codeBlock") ? "is-active" : undefined}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          type="button"
        >
          Code
        </button>
        <button
          className={editor.isActive("link") ? "is-active" : undefined}
          onClick={setLink}
          title="Link"
          type="button"
        >
          Link
        </button>
        <button onClick={onOpenGallery} title="Image" type="button">
          Image
        </button>
        {onOpenVideoGallery ? (
          <>
            <button onClick={onOpenVideoGallery} title="Video from the gallery" type="button">
              Video
            </button>
            <button onClick={insertEmbed} title="YouTube, Vimeo, or X post" type="button">
              Embed
            </button>
          </>
        ) : null}
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          type="button"
        >
          Table
        </button>
        <button
          onClick={() => {
            setCodeViewValue(editor.getHTML());
            setIsCodeView(true);
          }}
          type="button"
        >
          HTML
        </button>
      </div>
      <EditorContent className="blog-rich-text-content" editor={editor} />
    </div>
  );
}
