import { resolveRichTextImageSrc } from "@/lib/rich-text-image-src";

/** Wrapper class shared by the editor node, the sanitizer allowlist, and the blog body CSS. */
export const BLOG_EMBED_CLASS = "blog-embed";

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
