import { forbiddenAdminResponse } from "@/lib/admin-route-auth";
import type { AuthorizedAdmin } from "@/lib/admin-auth";
import { canPublishBlogContent, getAdminRole } from "@/lib/admin-rbac";
import type { BlogPostStatus } from "@/lib/blog";

export function assertBlogStatusAllowed(admin: AuthorizedAdmin, status: BlogPostStatus) {
  if (status === "published" && !canPublishBlogContent(getAdminRole(admin))) {
    return forbiddenAdminResponse("Only admins and owners can publish posts.");
  }

  return null;
}
