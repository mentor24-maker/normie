

import type { BuilderTemplateModule } from "@/lib/builder-template";
import { createEmptyModule, normalizeBuilderAssetUrl } from "@/lib/builder-template";

import { normalizeSocialIconBackgroundColor } from "@/lib/social-icon-background";

import { parseHeadlineRotatorItemsForEditor, serializeHeadlineRotatorEntries, type HeadlineRotatorEntry } from "@/lib/headline-rotator";

export type ParsedTableData = {
  headers: string[];
  cells: Record<string, BuilderTemplateModule[]>;
  rowCount: number;
};

export type SliderItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

export type SocialItem = {
  id: string;
  label: string;
  href: string;
  iconUrl: string;
  backgroundColor: string;
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export type HeadlineItem = HeadlineRotatorEntry;

export function parseHeadlineItems(settings: Record<string, string>): HeadlineItem[] {
  return parseHeadlineRotatorItemsForEditor(settings.headlines ?? "", settings.color || "#18324a");
}

export function serializeHeadlineItems(items: HeadlineItem[]) {
  return serializeHeadlineRotatorEntries(items);
}

export function parseNavItems(settings: Record<string, string>): NavItem[] {
  try {
    const items = JSON.parse(settings.navItems || "[]");
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(raw.id || `nav-${index + 1}`),
        label: String(raw.label || ""),
        href: String(raw.href || "")
      };
    });
  } catch {
    return [];
  }
}

export function serializeNavItems(items: NavItem[]) {
  return JSON.stringify(items);
}

export function parseSliderItems(settings: Record<string, string>): SliderItem[] {
  try {
    const items = JSON.parse(settings.sliderItems || "[]");
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(raw.id || `slide-${index + 1}`),
        title: String(raw.title || ""),
        body: String(raw.body || ""),
        imageUrl: normalizeBuilderAssetUrl(raw.imageUrl),
        linkUrl: String(raw.linkUrl || "")
      };
    });
  } catch {
    return [];
  }
}

export function serializeSliderItems(items: SliderItem[]) {
  return JSON.stringify(items);
}

export function parseSocialItems(settings: Record<string, string>): SocialItem[] {
  try {
    const items = JSON.parse(settings.socialItems || "[]");
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(raw.id || `social-${index + 1}`),
        label: String(raw.label || ""),
        href: String(raw.href || ""),
        iconUrl: normalizeBuilderAssetUrl(raw.iconUrl),
        backgroundColor: normalizeSocialIconBackgroundColor(raw.backgroundColor)
      };
    });
  } catch {
    return [];
  }
}

export function parseTableData(settings: Record<string, string>): ParsedTableData {
  try {
    const data = JSON.parse(settings.tableData || "{}");
    const headers: string[] = Array.isArray(data.headers) ? data.headers : [];

    if (data.cells && typeof data.rowCount === "number") {
      const cells: Record<string, BuilderTemplateModule[]> = {};
      for (const [key, mods] of Object.entries(data.cells)) {
        cells[key] = Array.isArray(mods) ? (mods as BuilderTemplateModule[]) : [];
      }
      return { headers, cells, rowCount: data.rowCount };
    }

    if (Array.isArray(data.rows)) {
      const cells: Record<string, BuilderTemplateModule[]> = {};
      for (let ri = 0; ri < data.rows.length; ri++) {
        const row = data.rows[ri];
        if (!Array.isArray(row)) continue;
        for (let ci = 0; ci < row.length; ci++) {
          const text = String(row[ci] || "");
          if (text) {
            const mod = createEmptyModule("text", "");
            mod.text = text;
            mod.name = "Text";
            cells[`${ri}-${ci}`] = [mod];
          }
        }
      }
      return { headers, cells, rowCount: data.rows.length };
    }

    return { headers, cells: {}, rowCount: Math.max(Number(data.rowCount) || 0, 1) };
  } catch {
    return { headers: [], cells: {}, rowCount: 1 };
  }
}

export function serializeTableData(td: ParsedTableData): string {
  return JSON.stringify({ headers: td.headers, cells: td.cells, rowCount: td.rowCount });
}

export function cloneTableCellModule(module: BuilderTemplateModule, suffix: string): BuilderTemplateModule {
  return {
    ...module,
    id: `${module.type}-${Date.now()}-${suffix}`,
    settings: { ...module.settings }
  };
}

/* ---------- Inline palette for table cells ---------- */

