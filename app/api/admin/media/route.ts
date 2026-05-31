import { NextResponse } from "next/server";
import path from "node:path";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { getMediaKind } from "@/lib/admin-media";
import { buildGalleryUploadFileName } from "@/lib/gallery-upload-filename";
import {
  createGalleryMediaRecord,
  listGalleryMediaLibrary,
  setGalleryMediaBadge,
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
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load media library." },
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
    const body = (await request.json()) as { storageName?: unknown; badge?: unknown };
    const storageName = String(body.storageName ?? "").trim();
    const badge = body.badge === true;

    if (!storageName) {
      return auth.finish(NextResponse.json({ error: "A gallery file name is required." }, { status: 400 }));
    }

    const record = await setGalleryMediaBadge(storageName, badge);

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage.from("gallery").upload(finalName, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      throw uploadError;
    }

    await createGalleryMediaRecord(finalName, badge);

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
          badge
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
