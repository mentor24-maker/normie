import { NextResponse } from "next/server";
import { canAssignTeamRole, getAdminRole } from "@/lib/admin-rbac";
import { forbiddenAdminResponse, requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeUserRole, safeUserText } from "@/lib/admin-users";
import { getAdminAuthCallbackUrl } from "@/lib/site-url";
import { createTeamInvitation } from "@/lib/team-invitations";

export async function POST(request: Request) {
  const auth = await requireAdminRoute("team:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    email?: unknown;
    fullName?: unknown;
    role?: unknown;
    notes?: unknown;
    resend?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const fullName = safeUserText(body.fullName, 255);
  const role = normalizeUserRole(body.role);
  const notes = safeUserText(body.notes, 4000);
  const resend = body.resend === true || body.resend === "true";

  if (!email) {
    return auth.finish(NextResponse.json({ error: "Email is required." }, { status: 400 }));
  }

  if (!canAssignTeamRole(getAdminRole(auth.admin), role)) {
    return forbiddenAdminResponse("Only owners can invite or assign the owner role.");
  }

  try {
    const invitation = await createTeamInvitation({
      email,
      fullName,
      role,
      notes,
      redirectTo: getAdminAuthCallbackUrl(request),
      resend
    });

    return auth.finish(
      NextResponse.json({
        ...invitation,
        message: invitation.resent
          ? "Invitation email resent. Ask them to check spam if it does not arrive within a few minutes."
          : "Invitation email sent. Ask them to check spam if it does not arrive within a few minutes."
      })
    );
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite team member." },
      { status: 500 }
    ));
  }
}
