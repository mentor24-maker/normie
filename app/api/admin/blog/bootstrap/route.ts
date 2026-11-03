import { NextResponse } from "next/server";
import { listDirectoryUsers } from "@/lib/admin-directory";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { adminHasPermission, getAdminRole } from "@/lib/admin-rbac";
import { safeUserText } from "@/lib/admin-users";
import {
  listAdminBlogCategories,
  listAdminBlogPosts,
  listAdminBlogTags,
  listAdminBlogTopics
} from "@/lib/blog-store";
import { blogSettingsToClientPayload, getAdminBlogSettings } from "@/lib/blog-settings";

export async function GET() {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  const { admin } = auth;
  const role = getAdminRole(admin);

  try {
    const [posts, topics, categories, tags, settings, users] = await Promise.all([
      listAdminBlogPosts(),
      listAdminBlogTopics(),
      listAdminBlogCategories(),
      listAdminBlogTags(),
      getAdminBlogSettings(),
      adminHasPermission(role, "team:read") ? listDirectoryUsers("team_users") : Promise.resolve([])
    ]);

    return auth.finish(
      NextResponse.json({
        posts,
        topics,
        categories,
        tags,
        settings: blogSettingsToClientPayload(settings),
        users,
        user: {
          id: admin.authUser.id,
          email: admin.authUser.email ?? "",
          fullName: safeUserText(admin.profile.full_name ?? admin.authUser.user_metadata?.full_name, 255),
          role
        }
      })
    );
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load blog workspace data." },
        { status: 500 }
      )
    );
  }
}
