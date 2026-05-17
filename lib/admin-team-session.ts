import type { User } from "@supabase/supabase-js";
import { getAdminProfile } from "@/lib/admin-auth";
import { safeUserText, type UserProfileRow } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";
import { activateInvitedTeamProfile, findInvitedTeamProfileByEmail } from "@/lib/team-invitations";

export async function resolveAdminTeamProfileForAuthUser(authUser: User): Promise<UserProfileRow | null> {
  const adminClient = createAdminClient();
  let profile = await getAdminProfile(authUser.id);

  if (profile?.status === "invited") {
    return activateInvitedTeamProfile(authUser, profile);
  }

  if (profile?.status === "active") {
    return profile;
  }

  if (!authUser.email) {
    return null;
  }

  const invitation = await findInvitedTeamProfileByEmail(authUser.email);

  if (!invitation) {
    return null;
  }

  const fullName = safeUserText(
    invitation.profile.full_name ?? authUser.user_metadata?.full_name,
    255
  );
  const timestamp = new Date().toISOString();
  const { error: claimError } = await adminClient.from("team_users").upsert({
    id: authUser.id,
    full_name: fullName,
    role: invitation.profile.role ?? "editor",
    status: "active",
    notes: invitation.profile.notes ?? "",
    updated_at: timestamp
  });

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (invitation.authUser.id !== authUser.id) {
    await adminClient.from("team_users").delete().eq("id", invitation.authUser.id);
    await adminClient.auth.admin.deleteUser(invitation.authUser.id);
  }

  return getAdminProfile(authUser.id);
}
