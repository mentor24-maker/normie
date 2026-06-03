import fs from "node:fs/promises";
import path from "node:path";

const contentTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".m4v", "video/x-m4v"],
  [".webm", "video/webm"],
  [".ogg", "video/ogg"]
]);

export function getPublicMediaContentType(filePath: string) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

export function resolvePublicGalleryFile(slug: string[]) {
  const safeParts = slug.filter((part) => part && part !== "." && part !== "..");

  if (safeParts.length === 0) {
    return null;
  }

  const filePath = path.join(process.cwd(), "images", "gallery", ...safeParts);
  const galleryRoot = path.join(process.cwd(), "images", "gallery");
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(`${galleryRoot}${path.sep}`) && resolvedPath !== galleryRoot) {
    return null;
  }

  return resolvedPath;
}

export async function readPublicGalleryFile(slug: string[]) {
  const filePath = resolvePublicGalleryFile(slug);

  if (!filePath) {
    return null;
  }

  try {
    const file = await fs.readFile(filePath);
    return {
      file,
      contentType: getPublicMediaContentType(filePath)
    };
  } catch {
    return null;
  }
}

export function resolvePublicSiteMediaFile(slug: string[]) {
  const safeParts = slug.filter((part) => part && part !== "." && part !== "..");

  if (safeParts.length === 0 || safeParts[0] === "gallery") {
    return null;
  }

  const imagesRoot = path.join(process.cwd(), "images");
  const filePath = path.join(imagesRoot, ...safeParts);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(`${imagesRoot}${path.sep}`) && resolvedPath !== imagesRoot) {
    return null;
  }

  return resolvedPath;
}

/** Site assets under `images/` outside the gallery bucket (logos, icons, WYR art, etc.). */
export async function readPublicSiteMediaFile(slug: string[]) {
  const filePath = resolvePublicSiteMediaFile(slug);

  if (!filePath) {
    return null;
  }

  try {
    const file = await fs.readFile(filePath);
    return {
      file,
      contentType: getPublicMediaContentType(filePath)
    };
  } catch {
    return null;
  }
}
