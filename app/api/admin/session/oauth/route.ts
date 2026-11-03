import { NextResponse } from "next/server";
import {
  applyAdminSessionCookies,
  buildAdminSessionSnapshot,
  getAdminUserFromToken
} from "@/lib/admin-auth";
import { resolveAdminTeamProfileForAuthUser } from "@/lib/admin-team-session";
import { safeUserText } from "@/lib/admin-users";
import { findInvitedTeamProfileByEmail } from "@/lib/team-invitations";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  };

  const accessToken = safeUserText(body.accessToken, 4000);
  const refreshToken = safeUserText(body.refreshToken, 4000);

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Missing session tokens." }, { status: 400 });
  }

  const authUser = await getAdminUserFromToken(accessToken);

  if (!authUser) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let profile;

  try {
    profile = await resolveAdminTeamProfileForAuthUser(authUser);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to activate team access." },
      { status: 500 }
    );
  }

  if (!profile || profile.status !== "active") {
    const pendingInvite = authUser.email ? await findInvitedTeamProfileByEmail(authUser.email) : null;

    return NextResponse.json(
      {
        error: pendingInvite
          ? `This sign-in does not match the invited email (${pendingInvite.authUser.email ?? "see your invite"}). Use that email with Google, or open Register on the admin page and set a password for the invited address.`
          : "This account is not authorized for admin access."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: authUser.id,
      email: authUser.email ?? "",
      fullName: safeUserText(profile.full_name ?? authUser.user_metadata?.full_name, 255)
    }
  });

  applyAdminSessionCookies(response, accessToken, refreshToken, buildAdminSessionSnapshot(authUser, profile));

  return response;
}
