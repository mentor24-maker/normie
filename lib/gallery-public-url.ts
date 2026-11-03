/** Client-safe Supabase public URL for a gallery storage object name. */
export function buildSupabaseGalleryPublicUrl(storageName: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const normalizedName = storageName.trim().replace(/^\/+/, "");

  if (!base || !normalizedName) {
    return "";
  }

  const encodedPath = normalizedName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/gallery/${encodedPath}`;
}
