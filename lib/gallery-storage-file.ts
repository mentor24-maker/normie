import { getPublicMediaContentType } from "@/lib/public-media";
import { createAdminClient } from "@/lib/supabase-admin";

/** Read a gallery object from Supabase Storage (production source of truth). */
export async function readSupabaseGalleryFile(slug: string[]) {
  const storageName = slug.filter((part) => part && part !== "." && part !== "..").join("/");

  if (!storageName) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("gallery").download(storageName);

  if (error || !data) {
    return null;
  }

  const extension = storageName.includes(".") ? storageName.slice(storageName.lastIndexOf(".")) : "";

  return {
    file: data,
    contentType: getPublicMediaContentType(extension ? `file${extension}` : storageName)
  };
}
