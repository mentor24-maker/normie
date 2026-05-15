import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import { normalizeUserRole, safeUserText } from "@/lib/admin-users";
import { createTeamInvitation } from "@/lib/team-invitations";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
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
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
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

    return NextResponse.json({
      ...invitation,
      message: invitation.emailSent
        ? "Invitation email sent."
        : "Team member already has a Supabase auth account. Invitation profile was updated."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite team member." },
      { status: 500 }
    );
  }
}
