import type { User } from "@supabase/supabase-js";
import {
  mergeAdminUserRecord,
  normalizeUserRole,
  safeUserText,
  type UserProfileRow,
  type UserRole
} from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

export type TeamInvitationMatch = {
  authUser: User;
  profile: UserProfileRow;
};

const AUTH_EMAIL_ALREADY_REGISTERED = /already been registered/i;

export function shouldResetAuthBeforeInvite(
  resend: boolean,
  profile: Pick<UserProfileRow, "status"> | null | undefined
) {
  if (resend) {
    return true;
  }

  if (!profile) {
    return true;
  }

  return profile.status === "invited";
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = safeUserText(email, 255).toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  return ((data.users ?? []) as User[]).find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;
}

export async function findInvitedTeamProfileByEmail(email: string): Promise<TeamInvitationMatch | null> {
  const authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("team_users")
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .eq("id", authUser.id)
    .eq("status", "invited")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return { authUser, profile: data as UserProfileRow };
  }

  const { data: profileByEmail, error: profileByEmailError } = await supabase
    .from("team_users")
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .eq("status", "invited");

  if (profileByEmailError) {
    throw new Error(profileByEmailError.message);
  }

  for (const profile of (profileByEmail ?? []) as UserProfileRow[]) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.id);

    if (authError || !authData.user?.email) {
      continue;
    }

    if (authData.user.email.toLowerCase() === email.toLowerCase()) {
      return { authUser: authData.user, profile };
    }
  }

  return null;
}

export async function activateInvitedTeamProfile(
  authUser: User,
  profile: UserProfileRow
): Promise<UserProfileRow | null> {
  if (profile.status !== "invited") {
    return profile.status === "active" ? profile : null;
  }

  const supabase = createAdminClient();
  const fullName = safeUserText(profile.full_name ?? authUser.user_metadata?.full_name, 255);
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("team_users")
    .upsert({
      id: authUser.id,
      full_name: fullName,
      role: normalizeUserRole(profile.role),
      status: "active",
      notes: profile.notes ?? "",
      updated_at: timestamp
    })
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to activate invited team member.");
  }

  return data as UserProfileRow;
}

async function getTeamProfileByAuthId(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("team_users")
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserProfileRow | null) ?? null;
}

async function removeTeamMemberAuthRecord(userId: string) {
  const supabase = createAdminClient();
  const { error: profileError } = await supabase.from("team_users").delete().eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(authError.message);
  }
}

async function sendTeamInviteEmail(email: string, fullName: string, redirectTo: string): Promise<User> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName
    },
    redirectTo
  });

  if (error) {
    if (AUTH_EMAIL_ALREADY_REGISTERED.test(error.message)) {
      throw new Error(
        "Supabase still has an auth record for this email. Use Resend Invite in the team directory, or delete the member and invite again."
      );
    }

    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Failed to send invitation email.");
  }

  return data.user;
}

export async function createTeamInvitation({
  email,
  fullName,
  role,
  notes,
  redirectTo,
  resend = false
}: {
  email: string;
  fullName: string;
  role: UserRole;
  notes: string;
  redirectTo: string;
  resend?: boolean;
}) {
  const supabase = createAdminClient();
  const normalizedEmail = safeUserText(email, 255).toLowerCase();
  const existingUser = await findAuthUserByEmail(normalizedEmail);
  const existingProfile = existingUser ? await getTeamProfileByAuthId(existingUser.id) : null;

  if (existingProfile?.status === "active") {
    throw new Error("That email is already an active team member.");
  }

  if (existingUser && !shouldResetAuthBeforeInvite(resend, existingProfile)) {
    throw new Error(
      "This team member already has a Supabase login. Use Resend Invite for pending invitations, or edit their account instead."
    );
  }

  if (existingUser) {
    await removeTeamMemberAuthRecord(existingUser.id);
  }

  const authUser = await sendTeamInviteEmail(normalizedEmail, fullName, redirectTo);

  const timestamp = new Date().toISOString();
  const normalizedRole = normalizeUserRole(role);
  const { data: profile, error: profileError } = await supabase
    .from("team_users")
    .upsert({
      id: authUser.id,
      full_name: fullName,
      role: normalizedRole,
      status: "invited",
      notes,
      updated_at: timestamp
    })
    .select("id, full_name, role, status, notes, created_at, updated_at")
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Invitation email was sent, but team profile setup failed.");
  }

  return {
    user: mergeAdminUserRecord(authUser, profile as UserProfileRow),
    emailSent: true,
    resent: Boolean(resend || existingUser)
  };
}
