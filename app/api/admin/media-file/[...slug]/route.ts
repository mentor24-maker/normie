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

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const safeParts = slug.filter((part) => part !== ".." && part !== ".");
  const filePath = path.join(process.cwd(), "images", ...safeParts);
  const extension = path.extname(filePath).toLowerCase();

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
