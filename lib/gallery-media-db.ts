import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GALLERY_MEDIA_RECORD_SELECT_FULL,
  GALLERY_MEDIA_RECORD_SELECT_LEGACY,
  isMissingGalleryMediaColumnError,
  normalizeGalleryMediaRecordRow,
  type GalleryMediaRecordRow
} from "@/lib/gallery-media-record";
import type { GalleryMediaRecord } from "@/lib/gallery-media";

type GalleryMediaSelectOptions = {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
};

type GalleryMediaQueryResult = {
  records: GalleryMediaRecord[];
  count: number | null;
  usesLegacySchema: boolean;
};

function mapRows(rows: GalleryMediaRecordRow[] | null): GalleryMediaRecord[] {
  return (rows ?? []).map((row) => normalizeGalleryMediaRecordRow(row));
}

export async function selectGalleryMediaRecords(
  supabase: SupabaseClient,
  selectOptions?: GalleryMediaSelectOptions
): Promise<GalleryMediaQueryResult> {
  const { data, error, count } = await supabase
    .from("gallery_media")
    .select(GALLERY_MEDIA_RECORD_SELECT_FULL, selectOptions);

  if (!error) {
    return {
      records: mapRows(data as GalleryMediaRecordRow[] | null),
      count: count ?? null,
      usesLegacySchema: false
    };
  }

  if (!isMissingGalleryMediaColumnError(error.message)) {
    throw error;
  }

  const legacy = await supabase
    .from("gallery_media")
    .select(GALLERY_MEDIA_RECORD_SELECT_LEGACY, selectOptions);

  if (legacy.error) {
    throw legacy.error;
  }

  return {
    records: mapRows(legacy.data as GalleryMediaRecordRow[] | null),
    count: legacy.count ?? null,
    usesLegacySchema: true
  };
}

export function galleryMetadataMigrationHint(): string {
  return "Gallery metadata columns are missing. Apply supabase migrations 046_gallery_media_category_type.sql and 047_gallery_media_aspect.sql, then refresh.";
}

export async function fetchGalleryMediaRecordByName(
  supabase: SupabaseClient,
  storageName: string
): Promise<GalleryMediaRecord | null> {
  const { data, error } = await supabase
    .from("gallery_media")
    .select(GALLERY_MEDIA_RECORD_SELECT_FULL)
    .eq("storage_name", storageName)
    .maybeSingle();

  if (!error && data) {
    return normalizeGalleryMediaRecordRow(data as GalleryMediaRecordRow);
  }

  if (error && !isMissingGalleryMediaColumnError(error.message)) {
    throw error;
  }

  const legacy = await supabase
    .from("gallery_media")
    .select(GALLERY_MEDIA_RECORD_SELECT_LEGACY)
    .eq("storage_name", storageName)
    .maybeSingle();

  if (legacy.error) {
    throw legacy.error;
  }

  if (!legacy.data) {
    return null;
  }

  return normalizeGalleryMediaRecordRow(legacy.data as GalleryMediaRecordRow);
}
