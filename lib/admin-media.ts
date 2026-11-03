import fs from "node:fs/promises";
import path from "node:path";
import { getMediaKind, type AdminMediaItem } from "@/lib/admin-media-shared";

export type { AdminMediaItem, AdminMediaKind } from "@/lib/admin-media-shared";
export {
  GALLERY_FILTER_EXTENSIONS,
  GALLERY_IMAGE_EXTENSIONS,
  GALLERY_VIDEO_EXTENSIONS,
  getMediaKind
} from "@/lib/admin-media-shared";

export function getMediaAbsolutePath(relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "");
  return path.join(process.cwd(), normalized);
}

export async function listAdminMedia(): Promise<AdminMediaItem[]> {
  const directories = [
    { fsPath: path.join(process.cwd(), "images"), urlBase: "", directory: "images" as const },
    { fsPath: path.join(process.cwd(), "images", "gallery"), urlBase: "/gallery", directory: "gallery" as const }
  ];

  const files = await Promise.all(
    directories.map(async ({ fsPath, urlBase, directory }) => {
      const entries = await fs.readdir(fsPath, { withFileTypes: true }).catch(() => []);
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const extension = path.extname(entry.name).toLowerCase();
          const kind = getMediaKind(extension);
          if (!kind) return null;
          const relativeUrl = `${urlBase}/${entry.name}`.replace(/^\/+/, "");
          const publicPath =
            directory === "gallery"
              ? `/gallery/${entry.name}`
              : `/api/admin/media-file/${relativeUrl}`;

          return {
            name: entry.name,
            path: publicPath,
            directory,
            kind,
            extension
          } satisfies AdminMediaItem;
        })
        .filter((item): item is AdminMediaItem => Boolean(item));
    })
  );

  return files.flat().sort((a, b) => a.name.localeCompare(b.name));
}
