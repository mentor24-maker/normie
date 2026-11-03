import { deleteDirectoryUser, updateDirectoryUser } from "@/lib/admin-directory";

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateDirectoryUser(request, context, "team_users");
}

export function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return deleteDirectoryUser(request, context, "team_users");
}
