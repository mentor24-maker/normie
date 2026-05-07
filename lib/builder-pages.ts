import { unstable_noStore as noStore } from "next/cache";
import { rowToBuilderPage, safeText, type BuilderPageRecord } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function getPublishedBuilderPageBySlug(slug: string): Promise<BuilderPageRecord | null> {
  const normalizedSlug = safeText(slug, 255)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalizedSlug) {
    return null;
  }

  noStore();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .eq("slug", normalizedSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToBuilderPage(data);
}
