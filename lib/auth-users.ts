import type { SupabaseClient, User } from "@supabase/supabase-js";

const AUTH_USERS_PAGE_SIZE = 1000;

/**
 * Find a single auth user by email, paging through every page of
 * auth.admin.listUsers. Earlier code checked only the first page, which
 * silently broke email lookups once the instance passed 1000 users.
 */
export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE
    });

    if (error) {
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail);

    if (match) {
      return match;
    }

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      return null;
    }
  }
}

/**
 * List every auth user across all pages. Use for directory-style joins
 * (admin users list, crypto holders) that previously truncated at the
 * first 1000 users.
 */
export async function listAllAuthUsers(supabase: SupabaseClient): Promise<User[]> {
  const allUsers: User[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE
    });

    if (error) {
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    allUsers.push(...users);

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      return allUsers;
    }
  }
}
