/**
 * Pretty-printer for the rich text editors' HTML view.
 *
 * Formatting must not change what the document means when it is parsed back.
 *
 * `<pre>` runs are passed through untouched: whitespace inside them is significant, and indenting
 * their contents permanently adds that indentation to the author's code on every toggle.
 *
 * Line breaks are only inserted where two block-level elements meet. ProseMirror happens to
 * normalize whitespace between inline elements away, so breaking `</strong><em>` would survive
 * today — but relying on that couples the formatter to parser internals, and inline runs read
 * better on one line regardless.
 */

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dd",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "iframe",
  "img",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
  "video"
]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

const PRE_SEGMENT_PATTERN = /(<pre\b[\s\S]*?<\/pre>)/gi;
const BLOCK_BOUNDARY_PATTERN = /<(\/?)([a-z][\w-]*)\b[^>]*>(?=<(\/?)([a-z][\w-]*))/gi;
const LINE_TAG_PATTERN = /^<(\/?)([a-z][\w-]*)\b([^>]*)>/i;

const INDENT = "  ";

function isBlockTag(name: string) {
  return BLOCK_TAGS.has(name.toLowerCase());
}

/** Break only where a block element ends and another block element begins. */
function insertBlockLineBreaks(html: string) {
  return html.replace(BLOCK_BOUNDARY_PATTERN, (tag, _closeA, nameA: string, _closeB, nameB: string) =>
    isBlockTag(nameA) && isBlockTag(nameB) ? `${tag}\n` : tag
  );
}

function indentLines(lines: string[]) {
  const output: string[] = [];
  let depth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(LINE_TAG_PATTERN);
    const isClosing = match?.[1] === "/";
    const name = match?.[2]?.toLowerCase() ?? "";
    const selfClosing = match?.[3]?.trimEnd().endsWith("/") ?? false;

    if (match && isClosing) {
      depth = Math.max(0, depth - 1);
    }

    // Keep empty elements such as `<iframe ...></iframe>` on a single line.
    const next = lines[index + 1];
    if (match && !isClosing && !selfClosing && next === `</${name}>`) {
      output.push(INDENT.repeat(depth) + line + next);
      index += 1;
      continue;
    }

    output.push(INDENT.repeat(depth) + line);

    const opensBlock =
      match && !isClosing && !selfClosing && !VOID_TAGS.has(name) && isBlockTag(name) && !line.includes(`</${name}>`);

    if (opensBlock) {
      depth += 1;
    }
  }

  return output;
}

function formatSegment(html: string) {
  const lines = insertBlockLineBreaks(html)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return indentLines(lines).join("\n");
}

export function formatHtmlForCodeView(html: string) {
  const trimmed = html.trim();

  if (!trimmed) {
    return "";
  }

  // Odd indices are the captured `<pre>` runs, so map before filtering to keep the parity intact.
  return trimmed
    .split(PRE_SEGMENT_PATTERN)
    .map((segment, index) => (index % 2 === 1 ? segment : formatSegment(segment)))
    .filter((segment) => segment !== "")
    .join("\n");
}
