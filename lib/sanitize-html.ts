import DOMPurify from "isomorphic-dompurify";

const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "span",
  "div"
] as const;

const RICH_TEXT_ALLOWED_ATTR = ["href", "target", "rel", "style", "class"] as const;

const EMBED_EXTRA_TAGS = ["iframe"] as const;

const EMBED_EXTRA_ATTR = [
  "allow",
  "allowfullscreen",
  "frameborder",
  "scrolling",
  "src",
  "title",
  "width",
  "height",
  "loading",
  "referrerpolicy"
] as const;

function configureDomPurify() {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (node.tagName === "IFRAME") {
      node.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
    }
  });
}

let isConfigured = false;

function ensureConfigured() {
  if (!isConfigured) {
    configureDomPurify();
    isConfigured = true;
  }
}

export function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeRichTextHtml(html: string) {
  ensureConfigured();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false
  });
}

export function sanitizeEmbedHtml(html: string) {
  ensureConfigured();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS, ...EMBED_EXTRA_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR, ...EMBED_EXTRA_ATTR],
    ALLOW_DATA_ATTR: false
  });
}
