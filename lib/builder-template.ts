import type { CSSProperties } from "react";

export type BuilderTemplateLayout =
  | "single"
  | "two-column"
  | "three-column"
  | "two-four"
  | "four-two"
  | "one-five"
  | "five-one";

export type BackgroundStylePreset = "blue-yellow-circles";

export type BuilderTemplateModuleType =
  | "navigation"
  | "heading"
  | "text"
  | "image"
  | "quote"
  | "button"
  | "table"
  | "slider"
  | "social"
  | "previous-results"
  | "current-poll";

export type BuilderTemplateModule = {
  id: string;
  type: BuilderTemplateModuleType;
  column: string;
  name: string;
  text: string;
  settings: Record<string, string>;
};

export type BackgroundSettings = {
  mode: "none" | "color" | "gradient" | "image" | "style";
  color: string;
  color2: string;
  imageUrl: string;
  styleKey: "" | BackgroundStylePreset;
};

export type BuilderTemplateSection = {
  id: string;
  title: string;
  layout: BuilderTemplateLayout;
  alignment: "left" | "center" | "right";
  background: BackgroundSettings;
  cellBackgrounds: Record<string, BackgroundSettings>;
  cellPadding: Record<string, string>;
  cellBorderWidth: Record<string, string>;
  cellBorderColor: Record<string, string>;
  cellBorderRadius: Record<string, string>;
  modules: BuilderTemplateModule[];
};

export type BuilderTemplateRecord = {
  id: string;
  name: string;
  templateKind: "modular";
  pageBackground: BackgroundSettings;
  layoutSections: BuilderTemplateSection[];
  createdAt: string;
  updatedAt: string;
};

export type BuilderPageRecord = {
  id: string;
  name: string;
  slug: string;
  templateId: string;
  pageBackground: BackgroundSettings;
  layoutSections: BuilderTemplateSection[];
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
};

export const BUILDER_PREVIEW_STORAGE_KEY = "normie_builder_preview_draft";
export const BACKGROUND_STYLE_PRESETS: Array<{ value: BackgroundStylePreset; label: string }> = [
  { value: "blue-yellow-circles", label: "blue-yellow-circles" }
];

export function safeText(value: unknown, max = 10000) {
  return String(value ?? "").trim().slice(0, max);
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function formatRichTextContent(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  if (looksLikeHtml(text)) {
    return text;
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function normalizeBuilderAssetUrl(value: unknown): string {
  const text = safeText(value, 4000);

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);

    if (url.pathname === "/_next/image") {
      const nested = url.searchParams.get("url");
      return nested ? normalizeBuilderAssetUrl(nested) : "";
    }

    if (url.origin === "http://localhost:3000" || url.origin === "https://www.normie.one") {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    // Keep relative URLs and other non-URL strings as-is.
  }

  return text;
}

export function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLayoutColumns(layout: BuilderTemplateLayout) {
  if (
    layout === "two-column" ||
    layout === "two-four" ||
    layout === "four-two" ||
    layout === "one-five" ||
    layout === "five-one"
  ) {
    return ["left", "right"];
  }

  if (layout === "three-column") {
    return ["left", "center", "right"];
  }

  return ["main"];
}

export function getLayoutGridTemplate(layout: BuilderTemplateLayout) {
  if (layout === "four-two") {
    return "4fr 2fr";
  }

  if (layout === "two-four") {
    return "2fr 4fr";
  }

  if (layout === "one-five") {
    return "1fr 5fr";
  }

  if (layout === "five-one") {
    return "5fr 1fr";
  }

  if (layout === "two-column") {
    return "1fr 1fr";
  }

  if (layout === "three-column") {
    return "1fr 1fr 1fr";
  }

  return "1fr";
}

export function normalizeLayout(value: unknown): BuilderTemplateLayout {
  const layout = safeText(value, 40).toLowerCase();

  if (layout === "hero-split") {
    return "four-two";
  }

  if (
    layout === "two-column" ||
    layout === "three-column" ||
    layout === "two-four" ||
    layout === "four-two" ||
    layout === "one-five" ||
    layout === "five-one"
  ) {
    return layout;
  }

  return "single";
}

export function normalizeAlignment(value: unknown): BuilderTemplateSection["alignment"] {
  const alignment = safeText(value, 20).toLowerCase();

  if (alignment === "center" || alignment === "right") {
    return alignment;
  }

  return "left";
}

export function normalizeBackgroundMode(
  value: unknown
): BackgroundSettings["mode"] {
  const mode = safeText(value, 20).toLowerCase();

  if (mode === "color" || mode === "gradient" || mode === "image" || mode === "style") {
    return mode;
  }

  return "none";
}

export function normalizeBackgroundStyleKey(value: unknown): BackgroundSettings["styleKey"] {
  const styleKey = safeText(value, 80).toLowerCase();

  if (styleKey === "blue-yellow-circles") {
    return "blue-yellow-circles";
  }

  return "";
}

export function createDefaultBackgroundSettings(): BackgroundSettings {
  return {
    mode: "none",
    color: "#ffffff",
    color2: "#eaf4ff",
    imageUrl: "",
    styleKey: ""
  };
}

export function normalizeBackgroundSettings(value: unknown): BackgroundSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultBackgroundSettings();
  }

  const background = value as Record<string, unknown>;

  return {
    mode: normalizeBackgroundMode(background.mode),
    color: safeText(background.color, 40) || "#ffffff",
    color2: safeText(background.color2, 40) || "#eaf4ff",
    imageUrl: normalizeBuilderAssetUrl(background.imageUrl),
    styleKey: normalizeBackgroundStyleKey(background.styleKey)
  };
}

export function getBuilderBackgroundStyle(background: BackgroundSettings | undefined): CSSProperties | undefined {
  if (!background || background.mode === "none") {
    return undefined;
  }

  if (background.mode === "color") {
    return {
      background: background.color
    };
  }

  if (background.mode === "gradient") {
    return {
      backgroundImage: `linear-gradient(135deg, ${background.color} 0%, ${background.color2} 100%)`
    };
  }

  if (background.mode === "image" && background.imageUrl) {
    return {
      backgroundImage: `url("${background.imageUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    };
  }

  if (background.mode === "style" && background.styleKey === "blue-yellow-circles") {
    return {
      background:
        "radial-gradient(circle at 15% 15%, rgba(255, 214, 10, 0.35), transparent 18%), radial-gradient(circle at 82% 14%, rgba(23, 183, 238, 0.28), transparent 18%), radial-gradient(circle at 50% 72%, rgba(255, 255, 255, 0.92), transparent 24%), linear-gradient(135deg, #d9f5ff 0%, #f8feff 36%, #fff7bf 100%)"
    };
  }

  return undefined;
}

function normalizeCellBackgrounds(
  value: unknown,
  layout: BuilderTemplateLayout
): Record<string, BackgroundSettings> {
  const columns = getLayoutColumns(layout);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(columns.map((column) => [column, createDefaultBackgroundSettings()]));
  }

  const raw = value as Record<string, unknown>;
  return Object.fromEntries(
    columns.map((column) => [column, normalizeBackgroundSettings(raw[column])])
  );
}

function normalizeCellPadding(
  value: unknown,
  layout: BuilderTemplateLayout
): Record<string, string> {
  const columns = getLayoutColumns(layout);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(columns.map((column) => [column, "18"]));
  }

  const raw = value as Record<string, unknown>;

  return Object.fromEntries(
    columns.map((column) => {
      const parsed = Number.parseInt(String(raw[column] ?? "18"), 10);
      const normalized = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 50) : 18;
      return [column, String(normalized)];
    })
  );
}

function normalizeCellMetric(
  value: unknown,
  layout: BuilderTemplateLayout,
  fallback: string,
  min: number,
  max: number
): Record<string, string> {
  const columns = getLayoutColumns(layout);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(columns.map((column) => [column, fallback]));
  }

  const raw = value as Record<string, unknown>;

  return Object.fromEntries(
    columns.map((column) => {
      const parsed = Number.parseInt(String(raw[column] ?? fallback), 10);
      const normalized = Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : Number.parseInt(fallback, 10);
      return [column, String(normalized)];
    })
  );
}

function normalizeCellColor(
  value: unknown,
  layout: BuilderTemplateLayout,
  fallback: string
): Record<string, string> {
  const columns = getLayoutColumns(layout);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(columns.map((column) => [column, fallback]));
  }

  const raw = value as Record<string, unknown>;

  return Object.fromEntries(
    columns.map((column) => {
      const color = safeText(raw[column], 40);
      return [column, color || fallback];
    })
  );
}

export function normalizeModuleType(value: unknown): BuilderTemplateModuleType {
  const type = safeText(value, 40).toLowerCase();

  if (
    type === "navigation" ||
    type === "heading" ||
    type === "image" ||
    type === "quote" ||
    type === "button" ||
    type === "table" ||
    type === "slider" ||
    type === "social" ||
    type === "previous-results" ||
    type === "current-poll"
  ) {
    return type;
  }

  return "text";
}

export function normalizeModuleSettings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => {
      const normalizedKey = safeText(key, 120);
      const normalizedValue =
        normalizedKey === "url" || normalizedKey === "backgroundImageUrl"
          ? normalizeBuilderAssetUrl(raw)
          : normalizedKey === "tableData"
            ? safeText(raw, 200000)
            : safeText(raw, 10000);

      return [normalizedKey, normalizedValue];
    })
  );
}

export function normalizeLayoutSections(value: unknown): BuilderTemplateSection[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    try {
      return normalizeLayoutSections(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section, sectionIndex) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return null;
      }

      const normalizedSection = section as Record<string, unknown>;
      const layout = normalizeLayout(normalizedSection.layout);
      const allowedColumns = new Set(getLayoutColumns(layout));
      const modules = Array.isArray(normalizedSection.modules)
        ? normalizedSection.modules
            .map((module, moduleIndex) => {
              if (!module || typeof module !== "object" || Array.isArray(module)) {
                return null;
              }

              const normalizedModule = module as Record<string, unknown>;
              const column = safeText(normalizedModule.column, 40) || getLayoutColumns(layout)[0];

              return {
                id: safeText(normalizedModule.id, 120) || `module-${sectionIndex + 1}-${moduleIndex + 1}`,
                type: normalizeModuleType(normalizedModule.type),
                column: allowedColumns.has(column) ? column : getLayoutColumns(layout)[0],
                name: safeText(normalizedModule.name, 255),
                text: safeText(normalizedModule.text, 10000),
                settings: normalizeModuleSettings(normalizedModule.settings)
              } satisfies BuilderTemplateModule;
            })
            .filter((module): module is BuilderTemplateModule => Boolean(module))
        : [];

      return {
        id: safeText(normalizedSection.id, 120) || `section-${sectionIndex + 1}`,
        title: safeText(normalizedSection.title, 255),
        layout,
        alignment: normalizeAlignment(normalizedSection.alignment),
        background: normalizeBackgroundSettings(normalizedSection.background),
        cellBackgrounds: normalizeCellBackgrounds(normalizedSection.cellBackgrounds, layout),
        cellPadding: normalizeCellPadding(normalizedSection.cellPadding, layout),
        cellBorderWidth: normalizeCellMetric(normalizedSection.cellBorderWidth, layout, "1", 0, 20),
        cellBorderColor: normalizeCellColor(normalizedSection.cellBorderColor, layout, "#d9e4ef"),
        cellBorderRadius: normalizeCellMetric(normalizedSection.cellBorderRadius, layout, "24", 0, 60),
        modules
      } satisfies BuilderTemplateSection;
    })
    .filter((section): section is BuilderTemplateSection => Boolean(section));
}

export function createEmptySection(layout: BuilderTemplateLayout = "single"): BuilderTemplateSection {
  return {
    id: createLocalId("section"),
    title: "",
    layout,
    alignment: "left",
    background: createDefaultBackgroundSettings(),
    cellBackgrounds: Object.fromEntries(
      getLayoutColumns(layout).map((column) => [column, createDefaultBackgroundSettings()])
    ),
    cellPadding: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "18"])),
    cellBorderWidth: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "1"])),
    cellBorderColor: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "#d9e4ef"])),
    cellBorderRadius: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "24"])),
    modules: []
  };
}

export function createEmptyModule(
  type: BuilderTemplateModuleType = "text",
  column = "main"
): BuilderTemplateModule {
  const defaults: Record<string, string> =
    type === "heading"
      ? {
          level: "h2",
          fontSize: "32",
          color: "#18324a",
          bold: "true",
          italic: "false",
          underline: "false",
          dropShadow: "false",
          outline: "false"
        }
      : type === "image"
      ? {
          url: "",
          alt: "",
          size: "100",
          borderThickness: "0",
          borderColor: "#0f4f8f",
          borderRadius: "18",
          positionMode: "inline",
          overlayAnchor: "center",
          offsetX: "0",
          offsetY: "0",
          zIndex: "2"
        }
      : type === "button"
        ? {
            href: "",
            buttonColor: "#214c71",
            buttonHoverColor: "#0f4f8f",
            textColor: "#ffffff",
            textHoverColor: "#ffffff",
            borderColor: "#214c71",
            paddingX: "24",
            paddingY: "12"
          }
        : type === "table"
          ? {
              columns: "3",
              borderWidth: "1",
              borderColor: "#cccccc",
              cellPadding: "8",
              backgroundColor: "#ffffff",
              tableData: JSON.stringify({
                headers: ["", "", ""],
                cells: {},
                rowCount: 2
              })
            }
        : type === "slider"
            ? {
                sliderGap: "16",
                sliderCardWidth: "280",
                sliderHeight: "auto",
                sliderItems: JSON.stringify([])
              }
            : type === "social"
              ? {
                  socialIconSize: "44",
                  socialGap: "14",
                  socialShowLabels: "true",
                  socialItems: JSON.stringify([])
                }
              : type === "previous-results"
                ? {
                    showFallbackCopy: "true"
                  }
                : type === "current-poll"
                  ? {
                      showPromptCopy: "true"
                    }
          : {};

  return {
    id: createLocalId("module"),
    type,
    column,
    name: "",
    text: "",
    settings: defaults
  };
}

export function rowToBuilderTemplate(row: Record<string, unknown>): BuilderTemplateRecord {
  const document = normalizeBuilderDocument(row.layout_sections ?? row.layoutSections);

  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    templateKind: "modular",
    pageBackground: document.pageBackground,
    layoutSections: document.layoutSections,
    createdAt: safeText(row.created_at ?? row.createdAt, 120),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 120)
  };
}

export function rowToBuilderPage(row: Record<string, unknown>): BuilderPageRecord {
  const document = normalizeBuilderDocument(row.layout_sections ?? row.layoutSections);

  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    slug: safeText(row.slug, 255),
    templateId: safeText(row.template_id ?? row.templateId, 120),
    pageBackground: document.pageBackground,
    layoutSections: document.layoutSections,
    createdAt: safeText(row.created_at ?? row.createdAt, 120),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 120),
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true)
  };
}

export function normalizeBuilderDocument(value: unknown): {
  pageBackground: BackgroundSettings;
  layoutSections: BuilderTemplateSection[];
} {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const document = value as Record<string, unknown>;
    return {
      pageBackground: normalizeBackgroundSettings(document.pageBackground),
      layoutSections: normalizeLayoutSections(document.sections ?? document.layoutSections)
    };
  }

  return {
    pageBackground: createDefaultBackgroundSettings(),
    layoutSections: normalizeLayoutSections(value)
  };
}

export function serializeBuilderDocument(input: {
  pageBackground?: unknown;
  layoutSections?: unknown;
}) {
  return {
    pageBackground: normalizeBackgroundSettings(input.pageBackground),
    sections: normalizeLayoutSections(input.layoutSections)
  };
}
