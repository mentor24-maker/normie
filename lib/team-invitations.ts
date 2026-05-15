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

  return data ? { authUser, profile: data as UserProfileRow } : null;
}

export async function createTeamInvitation({
  email,
  fullName,
  role,
  notes,
  redirectTo
}: {
  email: string;
  fullName: string;
  role: UserRole;
  notes: string;
  redirectTo: string;
}) {
  const supabase = createAdminClient();
  const normalizedEmail = safeUserText(email, 255).toLowerCase();
  const existingUser = await findAuthUserByEmail(normalizedEmail);
  let authUser = existingUser;
  let emailSent = false;

  if (authUser) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        full_name: fullName
      },
      redirectTo
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      authUser = data.user;
      emailSent = true;
    }
  } else {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        full_name: fullName
      },
      redirectTo
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to invite team member.");
    }

    authUser = data.user;
    emailSent = true;
  }

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
    throw new Error(profileError?.message ?? "Invitation was created, but team profile setup failed.");
  }

  return {
    user: mergeAdminUserRecord(authUser, profile as UserProfileRow),
    emailSent
  };
}
