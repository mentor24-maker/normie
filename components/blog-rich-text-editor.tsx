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
import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";

type BlogRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onOpenGallery: () => void;
  galleryImagePath?: string | null;
  onGalleryImageConsumed?: () => void;
  placeholder?: string;
};

function buildYoutubeEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());
    let videoId = "";

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.replace("/", "");
    } else {
      videoId = url.searchParams.get("v") || "";
    }

    if (!videoId) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function buildTwitterEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());

    if (!url.hostname.includes("twitter.com") && !url.hostname.includes("x.com")) {
      return null;
    }

    return `https://platform.twitter.com/embed/Tweet.html?dnt=true&url=${encodeURIComponent(url.toString())}`;
  } catch {
    return null;
  }
}

export function BlogRichTextEditor({
  value,
  onChange,
  onOpenGallery,
  galleryImagePath,
  onGalleryImageConsumed,
  placeholder = "Write your post"
}: BlogRichTextEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false);
  const [codeViewValue, setCodeViewValue] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
      }),
      Image.configure({ HTMLAttributes: { class: "blog-editor-image" } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell
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

    if (editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !galleryImagePath) {
      return;
    }

    const src = galleryImagePath.startsWith("/gallery/")
      ? `/api/admin/media-file${galleryImagePath}`
      : galleryImagePath;
    editor.chain().focus().setImage({ src, alt: "" }).run();
    onGalleryImageConsumed?.();
  }, [editor, galleryImagePath, onGalleryImageConsumed]);

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

  function insertEmbed(kind: "youtube" | "twitter") {
    if (!editor) {
      return;
    }

    const url = window.prompt(kind === "youtube" ? "YouTube URL" : "X / Twitter post URL");

    if (!url) {
      return;
    }

    const embedUrl = kind === "youtube" ? buildYoutubeEmbedUrl(url) : buildTwitterEmbedUrl(url);

    if (!embedUrl) {
      window.alert("Could not build an embed for that URL.");
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="blog-embed"><iframe src="${embedUrl}" title="${kind} embed" loading="lazy" allowfullscreen></iframe></div>`
      )
      .run();
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
        <button onClick={setLink} type="button">
          Link
        </button>
        <button onClick={onOpenGallery} type="button">
          Image
        </button>
        <button onClick={() => insertEmbed("youtube")} type="button">
          YouTube
        </button>
        <button onClick={() => insertEmbed("twitter")} type="button">
          X
        </button>
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
