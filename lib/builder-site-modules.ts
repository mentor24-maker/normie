import { unstable_noStore as noStore } from "next/cache";
import {
  rowToBuilderSavedSection,
  safeText,
  type BuilderTemplateSection
} from "@/lib/builder-template";
import { createPublicClient } from "@/lib/supabase-public";

/** Saved section names in Admin → Builder → Module repository → Saved sections. */
export const BLOG_HEADER_SAVED_SECTION_NAME = "Blog Header";
export const BLOG_MAIN_MENU_SAVED_SECTION_NAME = "New Main Menu";

async function getBuilderSavedSectionByName(name: string): Promise<BuilderTemplateSection | null> {
  const normalizedName = safeText(name, 255);

  if (!normalizedName) {
    return null;
  }

  noStore();

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("builder_saved_sections")
    .select("id, name, section, created_at, updated_at")
    .eq("name", normalizedName)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToBuilderSavedSection(data)?.section ?? null;
}

export async function getSavedSectionLayoutSections(
  sectionName: string
): Promise<BuilderTemplateSection[] | null> {
  const savedSection = await getBuilderSavedSectionByName(sectionName);

  if (!savedSection) {
    return null;
  }

  return [savedSection];
}

export async function getBlogHeaderLayoutSections(): Promise<BuilderTemplateSection[] | null> {
  return getSavedSectionLayoutSections(BLOG_HEADER_SAVED_SECTION_NAME);
}
