export const DEFAULT_BUILDER_HEX_COLOR = "#ffffff";

const LEGACY_WHITE_RGBA = new Set([
  "rgba(255, 255, 255, 0.94)",
  "rgba(255,255,255,0.94)",
  "rgba(255, 255, 255, 0.92)",
  "rgba(255,255,255,0.92)"
]);

function expandShortHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex;
}

function rgbComponentsToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

function parseRgbOrRgba(value: string): { r: number; g: number; b: number } | null {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  if (![r, g, b].every(Number.isFinite)) {
    return null;
  }

  return { r, g, b };
}

/** Builder color settings are stored and edited as hex (e.g. #ffffff). */
export function normalizeBuilderHexColor(value: unknown, fallback = DEFAULT_BUILDER_HEX_COLOR): string {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return fallback;
  }

  const compact = trimmed.replace(/\s+/g, "");

  if (LEGACY_WHITE_RGBA.has(trimmed) || LEGACY_WHITE_RGBA.has(compact)) {
    return fallback;
  }

  if (/^#[0-9a-f]{3}$/i.test(trimmed) || /^#[0-9a-f]{6}$/i.test(trimmed)) {
    return expandShortHex(trimmed.toLowerCase());
  }

  const rgb = parseRgbOrRgba(trimmed);

  if (rgb) {
    return rgbComponentsToHex(rgb.r, rgb.g, rgb.b);
  }

  return fallback;
}
