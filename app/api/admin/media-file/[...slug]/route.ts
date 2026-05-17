import { cookies } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { getPublicMediaContentType, readPublicGalleryFile } from "@/lib/public-media";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug } = await context.params;
  const safeParts = slug.filter((part) => part !== ".." && part !== ".");

  if (safeParts[0] === "gallery") {
    const galleryAsset = await readPublicGalleryFile(safeParts.slice(1));

    if (!galleryAsset) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(galleryAsset.file, {
      headers: {
        "Content-Type": galleryAsset.contentType,
        "Cache-Control": "no-store"
      }
    });
  }

  const filePath = path.join(process.cwd(), "images", ...safeParts);

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": getPublicMediaContentType(filePath),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
