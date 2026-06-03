import { buildPollCategoryCatalog, normalizePollCategoryForStorage } from "@/lib/poll-categories";

export function normalizeGalleryMediaCategory(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  return normalizePollCategoryForStorage(text) ?? text.slice(0, 255);
}

export function buildGalleryMediaCategoryOptions(extraCategories: string[] = []): string[] {
  return buildPollCategoryCatalog(extraCategories).map((category) => category.name);
}
