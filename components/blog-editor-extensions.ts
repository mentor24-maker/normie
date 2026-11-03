import type { Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { BlogEmbed } from "@/components/blog-embed-node";
import { RICH_TEXT_IMAGE_CLASS } from "@/lib/rich-text-image";

/**
 * Extension set shared by `BlogRichTextEditor` and the schema round-trip tests,
 * so the tests exercise the exact schema the editor runs.
 */
export function createBlogEditorExtensions(): Extensions {
  return [
    // StarterKit already bundles Underline in tiptap 3.x; adding it again logs
    // a duplicate-extension warning.
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: false
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
    }),
    // Inline, because marks only apply to inline content: with the default block
    // image node, the toolbar Link command on a selected image silently no-ops.
    Image.configure({
      inline: true,
      HTMLAttributes: { class: `${RICH_TEXT_IMAGE_CLASS} blog-editor-image` }
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    BlogEmbed
  ];
}
