import fs from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { listAdminMedia, getMediaKind } from "@/lib/admin-media";

export async function GET() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  try {
    const media = await listAdminMedia();
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media library." },
      { status: 500 }
    );
  }
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A media file is required." }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  const kind = getMediaKind(extension);

  if (!kind) {
    return NextResponse.json({ error: "Only image and video uploads are supported." }, { status: 400 });
  }

  const galleryDir = path.join(process.cwd(), "images", "gallery");
  await fs.mkdir(galleryDir, { recursive: true });

  const baseName = sanitizeFilename(path.basename(file.name, extension)) || "upload";
  const finalName = `${Date.now()}-${baseName}${extension}`;
  const finalPath = path.join(galleryDir, finalName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(finalPath, buffer);

  return NextResponse.json({
    media: {
      name: finalName,
      path: `/api/admin/media-file/gallery/${finalName}`,
      directory: "gallery",
      kind,
      extension
    }
  });
}
