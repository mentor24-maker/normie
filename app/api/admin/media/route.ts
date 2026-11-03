import { NextResponse } from "next/server";
import path from "node:path";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { getMediaKind } from "@/lib/admin-media";
import { buildGalleryUploadFileName } from "@/lib/gallery-upload-filename";
import { galleryMetadataMigrationHint } from "@/lib/gallery-media-db";
import { isMissingGalleryMediaColumnError } from "@/lib/gallery-media-record";
import { normalizeGalleryMediaAspect } from "@/lib/gallery-media-aspect";
import { normalizeGalleryMediaCategory } from "@/lib/gallery-media-category";
import { GALLERY_MEDIA_BADGE_TYPE, normalizeGalleryMediaType } from "@/lib/gallery-media-type";
import {
  createGalleryMediaRecord,
  listGalleryMediaLibrary,
  updateGalleryMediaMetadata,
  syncGalleryStorageIndex
} from "@/lib/gallery-media";
import {
  galleryMediaQueryUsesServerFilters,
  parseGalleryMediaQueryParams,
  queryGalleryMediaLibrary
} from "@/lib/gallery-media-query";
import { createAdminClient } from "@/lib/supabase-admin";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function parseBadgeFlag(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export async function GET(request: Request) {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = parseGalleryMediaQueryParams(searchParams);

    if (galleryMediaQueryUsesServerFilters(query)) {
      const result = await queryGalleryMediaLibrary(query, { syncIndex: syncGalleryStorageIndex });
      return auth.finish(NextResponse.json(result));
    }

    const media = await listGalleryMediaLibrary();
    return auth.finish(NextResponse.json({ media, total: media.length, limit: media.length, offset: 0 }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load media library.";

    return auth.finish(
      NextResponse.json(
        {
          error: isMissingGalleryMediaColumnError(message) ? galleryMetadataMigrationHint() : message
        },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as {
      storageName?: unknown;
      badge?: unknown;
      media_category?: unknown;
      media_type?: unknown;
      aspect?: unknown;
    };
    const storageName = String(body.storageName ?? "").trim();
    const hasBadge = Object.prototype.hasOwnProperty.call(body, "badge");
    const hasMediaCategory = Object.prototype.hasOwnProperty.call(body, "media_category");
    const hasMediaType = Object.prototype.hasOwnProperty.call(body, "media_type");
    const hasAspect = Object.prototype.hasOwnProperty.call(body, "aspect");

    if (!storageName) {
      return auth.finish(NextResponse.json({ error: "A gallery file name is required." }, { status: 400 }));
    }

    if (!hasBadge && !hasMediaCategory && !hasMediaType && !hasAspect) {
      return auth.finish(
        NextResponse.json(
          { error: "Provide badge, media_category, media_type, and/or aspect to update." },
          { status: 400 }
        )
      );
    }

    const record = await updateGalleryMediaMetadata(storageName, {
      ...(hasBadge ? { badge: body.badge === true } : {}),
      ...(hasMediaCategory ? { media_category: normalizeGalleryMediaCategory(body.media_category) } : {}),
      ...(hasMediaType ? { media_type: normalizeGalleryMediaType(body.media_type) } : {}),
      ...(hasAspect ? { aspect: normalizeGalleryMediaAspect(body.aspect) } : {})
    });

    return auth.finish(NextResponse.json({ record }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update gallery media." },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return auth.finish(NextResponse.json({ error: "A media file is required." }, { status: 400 }));
    }

    const extension = path.extname(file.name).toLowerCase();
    const kind = getMediaKind(extension);

    if (!kind) {
      return auth.finish(
        NextResponse.json({ error: "Only image and video uploads are supported." }, { status: 400 })
      );
    }

    const baseName = sanitizeFilename(path.basename(file.name, extension)) || "upload";
    const finalName = buildGalleryUploadFileName(baseName, extension);
    const badge = parseBadgeFlag(formData.get("badge"));
    const mediaCategory = normalizeGalleryMediaCategory(formData.get("media_category"));
    const mediaType = normalizeGalleryMediaType(
      formData.get("media_type") ?? (badge ? GALLERY_MEDIA_BADGE_TYPE : "")
    );
    const aspect = normalizeGalleryMediaAspect(formData.get("aspect"));

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage.from("gallery").upload(finalName, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      throw uploadError;
    }

    await createGalleryMediaRecord(finalName, {
      badge,
      media_category: mediaCategory,
      media_type: mediaType,
      aspect
    });

    const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(finalName);

    return auth.finish(
      NextResponse.json({
        media: {
          name: finalName,
          path: urlData.publicUrl,
          directory: "gallery",
          kind,
          extension,
          storageName: finalName,
          badge,
          mediaCategory,
          mediaType,
          aspect
        }
      })
    );
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to upload media." },
        { status: 500 }
      )
    );
  }
}
