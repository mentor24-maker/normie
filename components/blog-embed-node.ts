import { Node } from "@tiptap/core";
import {
  BLOG_EMBED_CLASS,
  BLOG_EMBED_IFRAME_ALLOW,
  BLOG_EMBED_IFRAME_TITLE,
  resolveBlogEmbedSource
} from "@/lib/blog-video-embed";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blogEmbed: {
      /** Insert a video or social embed from an author-supplied URL or gallery path. */
      setBlogEmbed: (src: string) => ReturnType;
    };
  }
}

function readEmbedSrc(element: HTMLElement) {
  return element.querySelector("iframe, video")?.getAttribute("src") ?? "";
}

/**
 * Blog bodies are stored as HTML, so embeds need a real schema node — raw `insertContent` of an
 * `<iframe>` is silently dropped by ProseMirror because nothing in the schema matches it.
 */
export const BlogEmbed = Node.create({
  name: "blogEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => readEmbedSrc(element),
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: `div.${BLOG_EMBED_CLASS}`,
        getAttrs: (element) => (resolveBlogEmbedSource(readEmbedSrc(element)) ? null : false)
      }
    ];
  },

  renderHTML({ node }) {
    const embed = resolveBlogEmbedSource(String(node.attrs.src ?? ""));

    if (!embed) {
      return ["div", { class: BLOG_EMBED_CLASS }];
    }

    if (embed.kind === "video") {
      return [
        "div",
        { class: BLOG_EMBED_CLASS },
        ["video", { src: embed.src, controls: "", preload: "metadata", playsinline: "" }]
      ];
    }

    return [
      "div",
      { class: BLOG_EMBED_CLASS },
      [
        "iframe",
        {
          src: embed.src,
          title: BLOG_EMBED_IFRAME_TITLE,
          loading: "lazy",
          allow: BLOG_EMBED_IFRAME_ALLOW,
          allowfullscreen: ""
        }
      ]
    ];
  },

  addCommands() {
    return {
      setBlogEmbed:
        (src: string) =>
        ({ commands }) => {
          if (!resolveBlogEmbedSource(src)) {
            return false;
          }

          return commands.insertContent({ type: this.name, attrs: { src } });
        }
    };
  }
});
