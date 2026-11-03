import { createDirectoryUser, getDirectoryUsers } from "@/lib/admin-directory";

export function GET() {
  return getDirectoryUsers("team_users");
}

export function POST(request: Request) {
  return createDirectoryUser(request, "team_users");
}
