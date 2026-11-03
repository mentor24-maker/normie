/**
 * Normalizes a URL typed into the rich text Link prompt.
 *
 * Returns null when there is nothing to link: blank input, or the prompt's
 * untouched "https://" default. Bare domains ("normie.one/about") get an
 * https:// prefix — stored as-is the browser resolves them relative to the
 * current page, so the published link 404s.
 */
export function normalizeRichTextLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || trimmed === "https://" || trimmed === "http://") {
    return null;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const isRelative = /^[/#?]/.test(trimmed);

  if (hasScheme || isRelative) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
