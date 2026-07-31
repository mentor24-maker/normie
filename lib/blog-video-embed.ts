import { resolveRichTextImageSrc } from "@/lib/rich-text-image-src";

/** Wrapper class shared by the editor node, the sanitizer allowlist, and the blog body CSS. */
export const BLOG_EMBED_CLASS = "blog-embed";

export const BLOG_EMBED_IFRAME_TITLE = "Embedded media";

export const BLOG_EMBED_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

const VIDEO_FILE_PATTERN = /\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i;

export type BlogEmbedSource =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string };

function resolveYoutubeEmbedSrc(url: URL, host: string) {
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const videoId =
    host === "youtu.be"
      ? parts[0]
      : parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live"
        ? parts[1]
        : url.searchParams.get("v");

  if (!videoId || !/^[\w-]+$/.test(videoId)) {
    return null;
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

function resolveVimeoEmbedSrc(url: URL, host: string) {
  if (host !== "vimeo.com" && host !== "player.vimeo.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const videoId = host === "player.vimeo.com" ? parts[parts.indexOf("video") + 1] : parts[0];

  if (!videoId || !/^\d+$/.test(videoId)) {
    return null;
  }

  // Unlisted videos carry a privacy hash, either as a path segment or an `h` query param.
  const privacyHash = host === "player.vimeo.com" ? url.searchParams.get("h") : parts[1];
  const suffix = privacyHash && /^[\w-]+$/.test(privacyHash) ? `?h=${privacyHash}` : "";

  return `https://player.vimeo.com/video/${videoId}${suffix}`;
}

function resolveTweetEmbedSrc(url: URL, host: string) {
  if (host === "platform.twitter.com") {
    return url.pathname === "/embed/Tweet.html" && url.searchParams.get("id") ? url.toString() : null;
  }

  if (host !== "twitter.com" && host !== "x.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const tweetId = parts[parts.indexOf("status") + 1];

  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return null;
  }

  return `https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${tweetId}`;
}

/** Gallery-hosted media only — blog bodies never point `<video>` at a third-party origin. */
function resolveGalleryVideoSrc(value: string) {
  const src = resolveRichTextImageSrc(value, "display");

  return src && VIDEO_FILE_PATTERN.test(src) ? src : null;
}

/**
 * Turn an author-supplied URL (or an already-rendered embed src) into the element the blog body
 * should show. Resolving is idempotent so stored HTML survives an editor round trip.
 */
export function resolveBlogEmbedSource(value: string | undefined): BlogEmbedSource | null {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const galleryVideo = resolveGalleryVideoSrc(raw);

  if (galleryVideo) {
    return { kind: "video", src: galleryVideo };
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const iframeSrc =
    resolveYoutubeEmbedSrc(url, host) ?? resolveVimeoEmbedSrc(url, host) ?? resolveTweetEmbedSrc(url, host);

  return iframeSrc ? { kind: "iframe", src: iframeSrc } : null;
}

/** Guard for `<video src>` in sanitized blog HTML — gallery-hosted video files only. */
export function isAllowedBlogVideoFileSrc(src: string) {
  return resolveGalleryVideoSrc(src) !== null;
}

/** Canonical stored markup for an embed. Kept in step with `BlogEmbed.renderHTML`. */
export function renderBlogEmbedHtml(embed: BlogEmbedSource) {
  const src = embed.src.replace(/"/g, "%22");

  if (embed.kind === "video") {
    return `<div class="${BLOG_EMBED_CLASS}"><video src="${src}" controls preload="metadata" playsinline></video></div>`;
  }

  return (
    `<div class="${BLOG_EMBED_CLASS}"><iframe src="${src}" title="${BLOG_EMBED_IFRAME_TITLE}" ` +
    `loading="lazy" allow="${BLOG_EMBED_IFRAME_ALLOW}" allowfullscreen></iframe></div>`
  );
}

/** Matches an embed snippet that was stored as escaped text rather than real markup. */
const ESCAPED_EMBED_PATTERN =
  /(?:&lt;div\b[\s\S]*?&gt;)?\s*&lt;(iframe|video)\b[\s\S]*?&gt;\s*&lt;\/\1&gt;\s*(?:&lt;\/div&gt;)?/gi;

/** Literal `<pre>` / `<code>` samples must keep showing their markup as text. */
const CODE_SEGMENT_PATTERN = /(<(?:pre|code)\b[\s\S]*?<\/(?:pre|code)>)/gi;

function decodeBasicEntities(value: string) {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function reviveEscapedEmbedSegment(segment: string) {
  return segment.replace(ESCAPED_EMBED_PATTERN, (match) => {
    const rawSrc = match.match(/\ssrc\s*=\s*(?:&quot;|["'])([\s\S]*?)(?:&quot;|["'])/i)?.[1] ?? "";
    const embed = resolveBlogEmbedSource(decodeBasicEntities(rawSrc));

    // Leave anything we cannot vouch for exactly as the author typed it.
    return embed ? renderBlogEmbedHtml(embed) : match;
  });
}

/**
 * The blog editor used to insert embeds by handing raw HTML to `insertContent`. Nothing in the
 * ProseMirror schema matched it, so Tiptap fell back to inserting it as plain text and posts ended
 * up with visible embed markup that can never become a video on its own. Recover those by reading
 * the src, validating it against the same provider allowlist as a fresh insert, and re-emitting
 * canonical markup. Only the src is reused — the author's text is never unescaped wholesale.
 */
export function reviveEscapedBlogEmbeds(html: string) {
  if (!html.includes("&lt;")) {
    return html;
  }

  return html
    .split(CODE_SEGMENT_PATTERN)
    .map((segment, index) => (index % 2 === 1 ? segment : reviveEscapedEmbedSegment(segment)))
    .join("");
}
