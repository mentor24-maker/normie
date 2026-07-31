import { sanitizeRichTextHtml } from "@/lib/sanitize-html";
import {
  RICH_TEXT_IMAGE_CLASS,
  resolveRichTextImageSrc,
  rewriteRichTextImageSrcInHtml
} from "@/lib/rich-text-image-src";

export {
  RICH_TEXT_IMAGE_CLASS,
  isAllowedRichTextImageSrc,
  resolveRichTextImageSrc,
  rewriteRichTextImageSrcInHtml,
  type RichTextImageSrcMode
} from "@/lib/rich-text-image-src";

export function buildRichTextImageTag(imagePath: string) {
  const src = resolveRichTextImageSrc(imagePath, "storage");

  if (!src) {
    return "";
  }

  return `<img src="${src}" alt="" class="${RICH_TEXT_IMAGE_CLASS}" />`;
}

/** Append a gallery image to stored rich-text HTML (used when picking from the media gallery). */
export function appendRichTextImageToHtml(html: string, imagePath: string) {
  const imgTag = buildRichTextImageTag(imagePath);

  if (!imgTag) {
    return html;
  }

  const trimmed = html.trim();
  const empty =
    !trimmed ||
    trimmed === "<p></p>" ||
    trimmed === "<p><br></p>" ||
    trimmed === "<p><br/></p>" ||
    trimmed === "<p><br /></p>";

  const next = empty ? `<p>${imgTag}</p>` : `${trimmed}<p>${imgTag}</p>`;

  return rewriteRichTextImageSrcInHtml(sanitizeRichTextHtml(next), "storage");
}
