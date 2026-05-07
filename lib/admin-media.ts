import fs from "node:fs/promises";
import path from "node:path";

export type AdminMediaKind = "image" | "video";

export type AdminMediaItem = {
  name: string;
  path: string;
  directory: "images" | "gallery";
  kind: AdminMediaKind;
  extension: string;
};

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const videoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm", ".ogg"]);

export function getMediaKind(extension: string): AdminMediaKind | null {
  const normalized = extension.toLowerCase();
  if (imageExtensions.has(normalized)) return "image";
  if (videoExtensions.has(normalized)) return "video";
  return null;
}

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
          const relativeUrl = `${urlBase}/${entry.name}`;

          return {
            name: entry.name,
            path: `/api/admin/media-file/${relativeUrl.replace(/^\/+/, "")}`,
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
