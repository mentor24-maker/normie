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
  | "headline-rotator"
  | "text"
  | "code"
  | "merch"
  | "image"
  | "video"
  | "quote"
  | "button"
  | "contact-form"
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
  verticalMargin: string;
  mobileHidden: string;
  desktopHidden: string;
  mobileLayout: "stack" | "keep" | "reverse-stack";
  background: BackgroundSettings;
  cellBackgrounds: Record<string, BackgroundSettings>;
  cellPadding: Record<string, string>;
  cellVerticalMargin: Record<string, string>;
  cellMobileHidden: Record<string, string>;
  cellDesktopHidden: Record<string, string>;
  cellBorderWidth: Record<string, string>;
  cellBorderColor: Record<string, string>;
  cellBorderRadius: Record<string, string>;
  cellBorderStyle: Record<string, string>;
  cellShadow: Record<string, string>;
  cellOpacity: Record<string, string>;
  cellHAlign: Record<string, string>;
  cellVAlign: Record<string, string>;
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

export type BuilderCellModuleRecord = {
  id: string;
  name: string;
  modules: BuilderTemplateModule[];
  createdAt: string;
  updatedAt: string;
};

export type BuilderSavedSectionRecord = {
  id: string;
  name: string;
  section: BuilderTemplateSection;
  createdAt: string;
  updatedAt: string;
};

export type BuilderProductType = "merch" | "personality_profile";

export type BuilderProductRecord = {
  id: string;
  name: string;
  productType: BuilderProductType;
  productUrl: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export const BUILDER_PREVIEW_STORAGE_KEY = "normie_builder_preview_draft";
export const BUILDER_PREVIEW_DEVICE_STORAGE_KEY = "normie_builder_preview_device";
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

export function normalizeMobileLayout(value: unknown): BuilderTemplateSection["mobileLayout"] {
  const mobileLayout = safeText(value, 40).toLowerCase();

  if (mobileLayout === "keep" || mobileLayout === "reverse-stack") {
    return mobileLayout;
  }

  return "stack";
}

export function normalizeBooleanText(value: unknown) {
  return safeText(value, 10).toLowerCase() === "true" ? "true" : "false";
}

export function normalizeSpacingValue(value: unknown, fallback = "0", min = 0, max = 160) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  const fallbackValue = Number.parseInt(fallback, 10);
  const normalized = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, min), max)
    : Math.min(Math.max(Number.isFinite(fallbackValue) ? fallbackValue : min, min), max);

  return String(normalized);
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
      return [column, normalizeSpacingValue(raw[column], fallback, min, max)];
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
    type === "headline-rotator" ||
    type === "code" ||
    type === "merch" ||
    type === "image" ||
    type === "video" ||
    type === "quote" ||
    type === "button" ||
    type === "contact-form" ||
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

function normalizeModuleSettingsForType(type: BuilderTemplateModuleType, value: unknown) {
  const settings = normalizeModuleSettings(value);

  if (type === "navigation") {
    delete settings.navBackground;
  }

  return settings;
}

export function normalizeBuilderModules(
  value: unknown,
  fallbackColumn = "main"
): BuilderTemplateModule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((module, moduleIndex) => {
      if (!module || typeof module !== "object" || Array.isArray(module)) {
        return null;
      }

      const normalizedModule = module as Record<string, unknown>;

      const type = normalizeModuleType(normalizedModule.type);

      return {
        id: safeText(normalizedModule.id, 120) || `module-${moduleIndex + 1}`,
        type,
        column: safeText(normalizedModule.column, 40) || fallbackColumn,
        name: safeText(normalizedModule.name, 255),
        text: safeText(normalizedModule.text, 10000),
        settings: normalizeModuleSettingsForType(type, normalizedModule.settings)
      } satisfies BuilderTemplateModule;
    })
    .filter((module): module is BuilderTemplateModule => Boolean(module));
}

export function rowToBuilderCellModule(row: Record<string, unknown>): BuilderCellModuleRecord {
  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    modules: normalizeBuilderModules(row.modules),
    createdAt: safeText(row.created_at ?? row.createdAt, 120),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 120)
  };
}

export function normalizeBuilderSection(value: unknown): BuilderTemplateSection | null {
  return normalizeLayoutSections([value])[0] ?? null;
}

export function rowToBuilderSavedSection(row: Record<string, unknown>): BuilderSavedSectionRecord | null {
  const section = normalizeBuilderSection(row.section);

  if (!section) {
    return null;
  }

  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    section,
    createdAt: safeText(row.created_at ?? row.createdAt, 120),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 120)
  };
}

export function normalizeProductType(value: unknown): BuilderProductType {
  const type = safeText(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return type === "personality_profile" ? "personality_profile" : "merch";
}

export function rowToBuilderProduct(row: Record<string, unknown>): BuilderProductRecord {
  return {
    id: safeText(row.id, 120),
    name: safeText(row.name, 255),
    productType: normalizeProductType(row.product_type ?? row.productType),
    productUrl: normalizeBuilderAssetUrl(row.product_url ?? row.productUrl),
    imageUrl: normalizeBuilderAssetUrl(row.image_url ?? row.imageUrl),
    createdAt: safeText(row.created_at ?? row.createdAt, 120),
    updatedAt: safeText(row.updated_at ?? row.updatedAt, 120)
  };
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

              const type = normalizeModuleType(normalizedModule.type);

              return {
                id: safeText(normalizedModule.id, 120) || `module-${sectionIndex + 1}-${moduleIndex + 1}`,
                type,
                column: allowedColumns.has(column) ? column : getLayoutColumns(layout)[0],
                name: safeText(normalizedModule.name, 255),
                text: safeText(normalizedModule.text, 10000),
                settings: normalizeModuleSettingsForType(type, normalizedModule.settings)
              } satisfies BuilderTemplateModule;
            })
            .filter((module): module is BuilderTemplateModule => Boolean(module))
        : [];

      return {
        id: safeText(normalizedSection.id, 120) || `section-${sectionIndex + 1}`,
        title: safeText(normalizedSection.title, 255),
        layout,
        alignment: normalizeAlignment(normalizedSection.alignment),
        verticalMargin: normalizeSpacingValue(normalizedSection.verticalMargin, "0", 0, 160),
        mobileHidden: normalizeBooleanText(normalizedSection.mobileHidden),
        desktopHidden: normalizeBooleanText(normalizedSection.desktopHidden),
        mobileLayout: normalizeMobileLayout(normalizedSection.mobileLayout),
        background: normalizeBackgroundSettings(normalizedSection.background),
        cellBackgrounds: normalizeCellBackgrounds(normalizedSection.cellBackgrounds, layout),
        cellPadding: normalizeCellPadding(normalizedSection.cellPadding, layout),
        cellVerticalMargin: normalizeCellMetric(normalizedSection.cellVerticalMargin, layout, "0", 0, 160),
        cellMobileHidden: normalizeCellColor(normalizedSection.cellMobileHidden, layout, "false"),
        cellDesktopHidden: normalizeCellColor(normalizedSection.cellDesktopHidden, layout, "false"),
        cellBorderWidth: normalizeCellMetric(normalizedSection.cellBorderWidth, layout, "1", 0, 20),
        cellBorderColor: normalizeCellColor(normalizedSection.cellBorderColor, layout, "#d9e4ef"),
        cellBorderRadius: normalizeCellMetric(normalizedSection.cellBorderRadius, layout, "24", 0, 60),
        cellBorderStyle: normalizeCellColor(normalizedSection.cellBorderStyle, layout, "solid"),
        cellShadow: normalizeCellColor(normalizedSection.cellShadow, layout, "none"),
        cellOpacity: normalizeCellColor(normalizedSection.cellOpacity, layout, "1"),
        cellHAlign: normalizeCellColor(normalizedSection.cellHAlign, layout, "left"),
        cellVAlign: normalizeCellColor(normalizedSection.cellVAlign, layout, "top"),
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
    verticalMargin: "0",
    mobileHidden: "false",
    desktopHidden: "false",
    mobileLayout: "stack",
    background: createDefaultBackgroundSettings(),
    cellBackgrounds: Object.fromEntries(
      getLayoutColumns(layout).map((column) => [column, createDefaultBackgroundSettings()])
    ),
    cellPadding: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "18"])),
    cellVerticalMargin: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "0"])),
    cellMobileHidden: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "false"])),
    cellDesktopHidden: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "false"])),
    cellBorderWidth: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "1"])),
    cellBorderColor: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "#d9e4ef"])),
    cellBorderRadius: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "24"])),
    cellBorderStyle: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "solid"])),
    cellShadow: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "none"])),
    cellOpacity: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "1"])),
    cellHAlign: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "left"])),
    cellVAlign: Object.fromEntries(getLayoutColumns(layout).map((column) => [column, "top"])),
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
          dropShadowX: "3",
          dropShadowY: "3",
          dropShadowBlur: "2",
          dropShadowColor: "rgba(0, 0, 0, 0.55)",
          outline: "false"
        }
      : type === "image"
      ? {
          url: "",
          linkUrl: "",
          newTab: "false",
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
      : type === "code"
      ? {
          label: "",
          snippetMode: "html"
        }
      : type === "merch"
      ? {
          productId: "",
          productUrl: "",
          productName: "",
          imageUrl: "",
          buttonLabel: "Buy on Redbubble"
        }
      : type === "video"
      ? {
          url: "",
          newTab: "true",
          videoName: "",
          videoDescription: ""
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
        : type === "contact-form"
          ? {
              formMode: "squeeze"
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
                  : type === "headline-rotator"
                    ? {
                        fontSize: "32",
                        color: "#18324a",
                        bold: "true",
                        dropShadow: "false",
                        dropShadowX: "3",
                        dropShadowY: "3",
                        dropShadowBlur: "2",
                        dropShadowColor: "rgba(0, 0, 0, 0.55)",
                        alignment: "center",
                        fadeDuration: "800",
                        displaySpeed: "3000",
                        headlines: JSON.stringify([])
                      }
          : {};

  return {
    id: createLocalId("module"),
    type,
    column,
    name: "",
    text: "",
    settings: { verticalMargin: "0", mobileHidden: "false", desktopHidden: "false", ...defaults }
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
