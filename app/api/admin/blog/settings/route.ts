import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  blogSettingsToClientPayload,
  getAdminBlogSettings,
  normalizeBlogSettingsInput,
  saveAdminBlogSettings
} from "@/lib/blog-settings";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const settings = await getAdminBlogSettings();
    return auth.finish(NextResponse.json({ settings: blogSettingsToClientPayload(settings) }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load blog settings." },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const input = normalizeBlogSettingsInput(await request.json());

  try {
    const settings = await saveAdminBlogSettings(input);
    return auth.finish(NextResponse.json({ settings: blogSettingsToClientPayload(settings) }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save blog settings." },
        { status: 500 }
      )
    );
  }
}
