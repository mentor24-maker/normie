import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { getMediaKind } from "@/lib/admin-media";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  return createClient(url, key);
}

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from("gallery").list("", {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" }
    });

    if (error) throw error;

    const media = (data ?? [])
      .filter((item) => item.name !== ".emptyFolderPlaceholder")
      .map((item) => {
        const extension = path.extname(item.name).toLowerCase();
        const kind = getMediaKind(extension) ?? "image";
        const { data: urlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(item.name);
        return {
          name: item.name,
          path: urlData.publicUrl,
          directory: "gallery",
          kind,
          extension
        };
      });

    return auth.finish(NextResponse.json({ media }));
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media library." },
      { status: 500 }
    ));
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
      return auth.finish(NextResponse.json(
        { error: "Only image and video uploads are supported." },
        { status: 400 }
      ));
    }

    const baseName = sanitizeFilename(path.basename(file.name, extension)) || "upload";
    const finalName = `${Date.now()}-${baseName}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(finalName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("gallery")
      .getPublicUrl(finalName);

    return auth.finish(
      NextResponse.json({
        media: {
          name: finalName,
          path: urlData.publicUrl,
          directory: "gallery",
          kind,
          extension
        }
      })
    );
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload media." },
      { status: 500 }
    ));
  }
}