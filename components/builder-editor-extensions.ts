import { Extension, type Extensions } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { RICH_TEXT_IMAGE_CLASS } from "@/lib/rich-text-image";

const FontSizeStyle = Extension.create({
  name: "fontSizeStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
          }
        }
      }
    ];
  }
});

const BlockStyle = Extension.create({
  name: "blockStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {}
          },
          color: {
            default: null,
            parseHTML: (element) => element.style.color || null,
            renderHTML: (attributes) =>
              attributes.color ? { style: `color: ${attributes.color}` } : {}
          }
        }
      }
    ];
  }
});

const TextShadowStyle = Extension.create({
  name: "textShadowStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          textShadow: {
            default: null,
            parseHTML: (element) => element.style.textShadow || null,
            renderHTML: (attributes) =>
              attributes.textShadow ? { style: `text-shadow: ${attributes.textShadow}` } : {}
          }
        }
      }
    ];
  }
});

const TextOutlineStyle = Extension.create({
  name: "textOutlineStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          textOutline: {
            default: null,
            parseHTML: (element) =>
              element.style.getPropertyValue("-webkit-text-stroke") ||
              element.style.webkitTextStroke ||
              null,
            renderHTML: (attributes) =>
              attributes.textOutline
                ? { style: `-webkit-text-stroke: ${attributes.textOutline}` }
                : {}
          }
        }
      }
    ];
  }
});

const LineHeightStyle = Extension.create({
  name: "lineHeightStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {}
          }
        }
      }
    ];
  }
});

/**
 * Extension set shared by `BuilderRichTextEditor` and the schema round-trip tests,
 * so the tests exercise the exact schema the editor runs.
 */
export function createBuilderEditorExtensions(): Extensions {
  return [
    // StarterKit already bundles Underline in tiptap 3.x; adding it again logs
    // a duplicate-extension warning.
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      link: false
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
    }),
    TextStyle,
    FontSizeStyle,
    BlockStyle,
    TextShadowStyle,
    TextOutlineStyle,
    LineHeightStyle,
    Color,
    // Inline, because marks only apply to inline content: with the default block
    // image node, the toolbar Link command on a selected image silently no-ops.
    Image.configure({
      inline: true,
      HTMLAttributes: { class: RICH_TEXT_IMAGE_CLASS }
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"]
    })
  ];
}
