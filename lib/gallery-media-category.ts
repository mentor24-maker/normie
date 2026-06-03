import { buildPollCategoryCatalog } from "@/lib/poll-categories";

export function normalizeGalleryMediaCategory(value: unknown): string {
  return String(value ?? "").trim().slice(0, 255);
}

export function buildGalleryMediaCategoryOptions(extraCategories: string[] = []): string[] {
  return buildPollCategoryCatalog(extraCategories).map((category) => category.name);
}
