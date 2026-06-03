import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { getMediaKind } from "@/lib/admin-media-shared";
import {
  listGalleryStorageMedia,
  loadGalleryMediaRecords,
  mergeGalleryMediaBadges
} from "@/lib/gallery-media";
import { galleryStorageNameInSet } from "@/lib/gallery-storage-match";
import type { GalleryMediaQueryParams } from "@/lib/gallery-media-query-params";

function storageFileExtension(storageName: string): string {
  const index = storageName.lastIndexOf(".");

  if (index < 0) {
    return "";
  }

  return storageName.slice(index).toLowerCase();
}

function kindStorageNamePattern(kind: "image" | "video"): RegExp {
  const extensions =
    kind === "image"
      ? ["png", "jpg", "jpeg", "webp", "gif", "svg"]
      : ["mp4", "mov", "m4v", "webm", "ogg"];

  return new RegExp(`\\.(${extensions.join("|")})$`, "i");
}

function matchesGalleryMediaQuery(item: AdminMediaItem, params: GalleryMediaQueryParams): boolean {
  const storageName = item.name;

  if (!storageName) {
    return false;
  }

  const filename = params.filename.trim();

  if (filename) {
    const matches = storageName.toLowerCase().includes(filename.toLowerCase());

    if (params.notFilename ? matches : !matches) {
      return false;
    }
  }

  if (params.extension) {
    const matches = storageName.toLowerCase().endsWith(params.extension.toLowerCase());

    if (params.notExtension ? matches : !matches) {
      return false;
    }
  }

  if (params.kind === "image" || params.kind === "video") {
    const matches = kindStorageNamePattern(params.kind).test(storageName);

    if (params.notKind ? matches : !matches) {
      return false;
    }
  }

  if (params.badge === "yes" && !item.badge) {
    return false;
  }

  if (params.badge === "no" && item.badge) {
    return false;
  }

  if (params.mediaCategory) {
    const category = item.mediaCategory ?? "";
    const matches = category === params.mediaCategory;

    if (params.notMediaCategory ? matches : !matches) {
      return false;
    }
  }

  if (params.mediaType) {
    const mediaType = item.mediaType ?? "";
    const matches = mediaType === params.mediaType;

    if (params.notMediaType ? matches : !matches) {
      return false;
    }
  }

  if (params.aspect) {
    const aspect = item.aspect ?? "square";
    const matches = aspect === params.aspect;

    if (params.notAspect ? matches : !matches) {
      return false;
    }
  }

  return getMediaKind(storageFileExtension(storageName)) !== null;
}

function sortGalleryMedia(items: AdminMediaItem[], sort: GalleryMediaQueryParams["sort"]) {
  const sorted = [...items];

  switch (sort) {
    case "name_desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "newest":
      sorted.sort((a, b) => {
        const aTime = Date.parse(a.createdAt ?? "") || 0;
        const bTime = Date.parse(b.createdAt ?? "") || 0;

        if (bTime !== aTime) {
          return bTime - aTime;
        }

        return a.name.localeCompare(b.name);
      });
      break;
    case "oldest":
      sorted.sort((a, b) => {
        const aTime = Date.parse(a.createdAt ?? "") || 0;
        const bTime = Date.parse(b.createdAt ?? "") || 0;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return a.name.localeCompare(b.name);
      });
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return sorted;
}

/** List gallery files linked on polls by matching storage file names (not only gallery_media rows). */
export async function listGalleryMediaLinkedToPolls(
  params: GalleryMediaQueryParams,
  linkedStorageNames: string[]
) {
  const [storageMedia, records] = await Promise.all([listGalleryStorageMedia(), loadGalleryMediaRecords()]);
  const merged = mergeGalleryMediaBadges(storageMedia, records);
  const linked = merged.filter((item) =>
    galleryStorageNameInSet(item.name, new Set(linkedStorageNames)) ||
    (item.storageName ? galleryStorageNameInSet(item.storageName, new Set(linkedStorageNames)) : false)
  );
  const filtered = linked.filter((item) => matchesGalleryMediaQuery(item, params));
  const sorted = sortGalleryMedia(filtered, params.sort);
  const page = sorted.slice(params.offset, params.offset + params.limit);

  return {
    media: page,
    total: sorted.length,
    limit: params.limit,
    offset: params.offset
  };
}
