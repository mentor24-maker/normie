import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeGalleryMediaAspect, type GalleryMediaAspect } from "@/lib/gallery-media-aspect";
import { normalizeGalleryMediaCategory } from "@/lib/gallery-media-category";
import { normalizeGalleryMediaType } from "@/lib/gallery-media-type";
import { deleteGalleryMediaFiles, updateGalleryMediaMetadata } from "@/lib/gallery-media";

type BulkPatchBody = {
  storageNames?: unknown;
  badge?: unknown;
  media_category?: unknown;
  media_type?: unknown;
  aspect?: unknown;
};

type BulkDeleteBody = {
  storageNames?: unknown;
};

function normalizeStorageNames(rawNames: unknown): string[] {
  if (!Array.isArray(rawNames)) {
    return [];
  }

  return [
    ...new Set(rawNames.map((name) => String(name ?? "").trim()).filter((name) => name.length > 0))
  ];
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as BulkPatchBody;
    const rawNames = body.storageNames;
    const hasBadge = Object.prototype.hasOwnProperty.call(body, "badge");
    const hasMediaCategory = Object.prototype.hasOwnProperty.call(body, "media_category");
    const hasMediaType = Object.prototype.hasOwnProperty.call(body, "media_type");
    const hasAspect = Object.prototype.hasOwnProperty.call(body, "aspect");

    if (!Array.isArray(rawNames) || rawNames.length === 0) {
      return auth.finish(
        NextResponse.json({ error: "At least one gallery file name is required." }, { status: 400 })
      );
    }

    if (!hasBadge && !hasMediaCategory && !hasMediaType && !hasAspect) {
      return auth.finish(
        NextResponse.json(
          { error: "Provide badge, media_category, media_type, and/or aspect to update." },
          { status: 400 }
        )
      );
    }

    const storageNames = normalizeStorageNames(rawNames);

    if (storageNames.length === 0) {
      return auth.finish(
        NextResponse.json({ error: "At least one gallery file name is required." }, { status: 400 })
      );
    }

    const patch = {
      ...(hasBadge ? { badge: body.badge === true } : {}),
      ...(hasMediaCategory ? { media_category: normalizeGalleryMediaCategory(body.media_category) } : {}),
      ...(hasMediaType ? { media_type: normalizeGalleryMediaType(body.media_type) } : {}),
      ...(hasAspect ? { aspect: normalizeGalleryMediaAspect(body.aspect) as GalleryMediaAspect } : {})
    };

    let updated = 0;
    const failures: string[] = [];

    for (const storageName of storageNames) {
      try {
        await updateGalleryMediaMetadata(storageName, patch);
        updated += 1;
      } catch (error) {
        failures.push(
          `${storageName}: ${error instanceof Error ? error.message : "Update failed."}`
        );
      }
    }

    if (updated === 0) {
      return auth.finish(
        NextResponse.json(
          { error: failures[0] ?? "No gallery media could be updated." },
          { status: 500 }
        )
      );
    }

    if (failures.length > 0) {
      return auth.finish(
        NextResponse.json({
          updated,
          warning: `${failures.length} of ${storageNames.length} updates failed.`,
          failures
        })
      );
    }

    return auth.finish(NextResponse.json({ updated }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to bulk update gallery media." },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as BulkDeleteBody;
    const storageNames = normalizeStorageNames(body.storageNames);

    if (storageNames.length === 0) {
      return auth.finish(
        NextResponse.json({ error: "At least one gallery file name is required." }, { status: 400 })
      );
    }

    const { deleted, failures } = await deleteGalleryMediaFiles(storageNames);

    if (failures.length > 0) {
      return auth.finish(
        NextResponse.json({
          deleted,
          warning: `${failures.length} of ${storageNames.length} deletes failed.`,
          failures
        })
      );
    }

    return auth.finish(NextResponse.json({ deleted }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete gallery media." },
        { status: 500 }
      )
    );
  }
}
