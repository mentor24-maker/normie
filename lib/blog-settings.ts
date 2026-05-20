import type { CSSProperties } from "react";
import { normalizeBuilderAssetUrl, safeText } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";

export type BlogBackgroundMode = "color" | "gradient" | "image";

export type BlogSettingsSnapshot = {
  articlePodWidth: string;
  sidebarWidth: string;
  articlePodBorderWidth: string;
  articlePodBorderColor: string;
  articlePodBackgroundMode: BlogBackgroundMode;
  articlePodBackgroundColor: string;
  articlePodBackgroundGradient: string;
  articlePodBackgroundImage: string;
  sidebarPodBorderWidth: string;
  sidebarPodBorderColor: string;
  sidebarPodBackgroundMode: BlogBackgroundMode;
  sidebarPodBackgroundColor: string;
  sidebarPodBackgroundGradient: string;
  sidebarPodBackgroundImage: string;
  horizontalMargin: string;
  verticalMargin: string;
  podRadius: string;
};

export type BlogSettings = BlogSettingsSnapshot & {
  updatedAt: string | null;
};

const BLOG_SETTINGS_SELECT =
  "settings, updated_at";

export const DEFAULT_BLOG_SETTINGS: BlogSettingsSnapshot = {
  articlePodWidth: "840",
  sidebarWidth: "300",
  articlePodBorderWidth: "1",
  articlePodBorderColor: "rgba(9, 16, 24, 0.08)",
  articlePodBackgroundMode: "color",
  articlePodBackgroundColor: "rgba(255, 255, 255, 0.92)",
  articlePodBackgroundGradient: "linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)",
  articlePodBackgroundImage: "",
  sidebarPodBorderWidth: "0",
  sidebarPodBorderColor: "rgba(9, 16, 24, 0.08)",
  sidebarPodBackgroundMode: "color",
  sidebarPodBackgroundColor: "transparent",
  sidebarPodBackgroundGradient: "linear-gradient(180deg, #ffffff 0%, #f6fbff 100%)",
  sidebarPodBackgroundImage: "",
  horizontalMargin: "40",
  verticalMargin: "40",
  podRadius: "20"
};

function clampNumber(value: unknown, fallback: string, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(Math.min(max, Math.max(min, parsed)));
}

function normalizeColor(value: unknown, fallback: string) {
  const text = safeText(value, 500).trim();

  if (!text) {
    return fallback;
  }

  if (
    /^#[0-9a-f]{3,8}$/i.test(text) ||
    /^rgba?\([0-9.,%\s]+\)$/i.test(text) ||
    /^hsla?\([0-9.,%\s]+\)$/i.test(text) ||
    /^(linear|radial|conic)-gradient\(/i.test(text) ||
    text === "transparent"
  ) {
    return text;
  }

  return fallback;
}

function normalizeGradient(value: unknown, fallback: string) {
  const text = safeText(value, 500).trim();

  if (!text) {
    return fallback;
  }

  return /^(linear|radial|conic)-gradient\(/i.test(text) ? text : fallback;
}

function normalizeBackgroundMode(value: unknown): BlogBackgroundMode {
  return value === "gradient" || value === "image" ? value : "color";
}

function normalizeImageUrl(value: unknown) {
  const text = safeText(value, 500).trim();

  return text ? normalizeBuilderAssetUrl(text) : "";
}

export function normalizeBlogSettingsInput(value: unknown): BlogSettingsSnapshot {
  const body = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

  return {
    articlePodWidth: clampNumber(body.articlePodWidth, DEFAULT_BLOG_SETTINGS.articlePodWidth, 320, 1400),
    sidebarWidth: clampNumber(body.sidebarWidth, DEFAULT_BLOG_SETTINGS.sidebarWidth, 220, 520),
    articlePodBorderWidth: clampNumber(
      body.articlePodBorderWidth,
      DEFAULT_BLOG_SETTINGS.articlePodBorderWidth,
      0,
      12
    ),
    articlePodBorderColor: normalizeColor(
      body.articlePodBorderColor,
      DEFAULT_BLOG_SETTINGS.articlePodBorderColor
    ),
    articlePodBackgroundMode: normalizeBackgroundMode(body.articlePodBackgroundMode),
    articlePodBackgroundColor: normalizeColor(
      body.articlePodBackgroundColor,
      DEFAULT_BLOG_SETTINGS.articlePodBackgroundColor
    ),
    articlePodBackgroundGradient: normalizeGradient(
      body.articlePodBackgroundGradient,
      DEFAULT_BLOG_SETTINGS.articlePodBackgroundGradient
    ),
    articlePodBackgroundImage: normalizeImageUrl(body.articlePodBackgroundImage),
    sidebarPodBorderWidth: clampNumber(
      body.sidebarPodBorderWidth,
      DEFAULT_BLOG_SETTINGS.sidebarPodBorderWidth,
      0,
      12
    ),
    sidebarPodBorderColor: normalizeColor(
      body.sidebarPodBorderColor,
      DEFAULT_BLOG_SETTINGS.sidebarPodBorderColor
    ),
    sidebarPodBackgroundMode: normalizeBackgroundMode(body.sidebarPodBackgroundMode),
    sidebarPodBackgroundColor: normalizeColor(
      body.sidebarPodBackgroundColor,
      DEFAULT_BLOG_SETTINGS.sidebarPodBackgroundColor
    ),
    sidebarPodBackgroundGradient: normalizeGradient(
      body.sidebarPodBackgroundGradient,
      DEFAULT_BLOG_SETTINGS.sidebarPodBackgroundGradient
    ),
    sidebarPodBackgroundImage: normalizeImageUrl(body.sidebarPodBackgroundImage),
    horizontalMargin: clampNumber(body.horizontalMargin, DEFAULT_BLOG_SETTINGS.horizontalMargin, 0, 120),
    verticalMargin: clampNumber(body.verticalMargin, DEFAULT_BLOG_SETTINGS.verticalMargin, 0, 120),
    podRadius: clampNumber(body.podRadius, DEFAULT_BLOG_SETTINGS.podRadius, 0, 80)
  };
}

function rowToBlogSettings(row: Record<string, unknown> | null): BlogSettings {
  const settings = normalizeBlogSettingsInput(row?.settings);

  return {
    ...settings,
    updatedAt: row?.updated_at ? String(row.updated_at) : null
  };
}

async function fetchBlogSettingsRow(
  supabase: ReturnType<typeof createPublicClient> | ReturnType<typeof createAdminClient>
) {
  return supabase.from("blog_settings").select(BLOG_SETTINGS_SELECT).eq("id", "default").maybeSingle();
}

export async function getPublicBlogSettings(): Promise<BlogSettings> {
  try {
    const result = await fetchBlogSettingsRow(createPublicClient());

    if (result.error) {
      return rowToBlogSettings(null);
    }

    return rowToBlogSettings((result.data as unknown as Record<string, unknown> | null) ?? null);
  } catch {
    return rowToBlogSettings(null);
  }
}

export async function getAdminBlogSettings(): Promise<BlogSettings> {
  try {
    const result = await fetchBlogSettingsRow(createAdminClient());

    if (result.error) {
      return rowToBlogSettings(null);
    }

    return rowToBlogSettings((result.data as unknown as Record<string, unknown> | null) ?? null);
  } catch {
    return rowToBlogSettings(null);
  }
}

export async function saveAdminBlogSettings(input: BlogSettingsSnapshot): Promise<BlogSettings> {
  const result = await createAdminClient()
    .from("blog_settings")
    .upsert(
      {
        id: "default",
        settings: normalizeBlogSettingsInput(input),
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    )
    .select(BLOG_SETTINGS_SELECT)
    .single();

  if (result.error) {
    throw new Error(
      result.error.message ??
        "Failed to save blog settings. Run supabase/migrations/011_blog_settings.sql in Supabase."
    );
  }

  return rowToBlogSettings((result.data as unknown as Record<string, unknown>) ?? null);
}

function resolveBackground(settings: BlogSettingsSnapshot, prefix: "articlePod" | "sidebarPod") {
  const mode = settings[`${prefix}BackgroundMode`];

  if (mode === "image") {
    const imageUrl = settings[`${prefix}BackgroundImage`];
    return imageUrl
      ? `center / cover no-repeat url("${imageUrl.replaceAll('"', "%22")}")`
      : settings[`${prefix}BackgroundColor`];
  }

  if (mode === "gradient") {
    return settings[`${prefix}BackgroundGradient`];
  }

  return settings[`${prefix}BackgroundColor`];
}

export function getBlogSettingsCssVariables(settings: BlogSettingsSnapshot): CSSProperties {
  return {
    "--blog-article-width": `${settings.articlePodWidth}px`,
    "--blog-sidebar-width": `${settings.sidebarWidth}px`,
    "--blog-article-border-width": `${settings.articlePodBorderWidth}px`,
    "--blog-article-border-color": settings.articlePodBorderColor,
    "--blog-article-background": resolveBackground(settings, "articlePod"),
    "--blog-sidebar-border-width": `${settings.sidebarPodBorderWidth}px`,
    "--blog-sidebar-border-color": settings.sidebarPodBorderColor,
    "--blog-sidebar-background": resolveBackground(settings, "sidebarPod"),
    "--blog-horizontal-margin": `${settings.horizontalMargin}px`,
    "--blog-vertical-margin": `${settings.verticalMargin}px`,
    "--blog-pod-radius": `${settings.podRadius}px`
  } as CSSProperties;
}

export function blogSettingsToClientPayload(settings: BlogSettings): BlogSettingsSnapshot {
  return normalizeBlogSettingsInput(settings);
}
