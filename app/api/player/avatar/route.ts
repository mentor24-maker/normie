import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMediaKind } from "@/lib/admin-media";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return NextResponse.json({ error: "Sign in to upload an avatar." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  const kind = getMediaKind(extension);

  if (kind !== "image") {
    return NextResponse.json({ error: "Only image uploads are supported for avatars." }, { status: 400 });
  }

  const baseName = sanitizeFilename(path.basename(file.name, extension)) || "avatar";
  const finalName = `player-avatars/${player.authUser.id}/${Date.now()}-${baseName}${extension}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage.from("gallery").upload(finalName, buffer, {
      contentType: file.type,
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(finalName);

    return NextResponse.json({
      data: {
        url: urlData.publicUrl
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar upload failed." },
      { status: 500 }
    );
  }
}
