import { NextResponse } from "next/server";
import { canAssignTeamRole, getAdminRole } from "@/lib/admin-rbac";
import { forbiddenAdminResponse, requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeUserRole, safeUserText } from "@/lib/admin-users";
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
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const fullName = safeUserText(body.fullName, 255);
  const role = normalizeUserRole(body.role);
  const notes = safeUserText(body.notes, 4000);

  if (!email) {
    return auth.finish(NextResponse.json({ error: "Email is required." }, { status: 400 }));
  }

  if (!canAssignTeamRole(getAdminRole(auth.admin), role)) {
    return forbiddenAdminResponse("Only owners can invite or assign the owner role.");
  }

  try {
    const origin = new URL(request.url).origin;
    const invitation = await createTeamInvitation({
      email,
      fullName,
      role,
      notes,
      redirectTo: `${origin}/admin`
    });

    return auth.finish(
      NextResponse.json({
        ...invitation,
        message: invitation.emailSent
          ? "Invitation email sent."
          : "Team member already has a Supabase auth account. Invitation profile was updated."
      })
    );
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite team member." },
      { status: 500 }
    ));
  }
}
