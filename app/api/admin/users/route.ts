import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { listAllAuthUsers } from "@/lib/auth-users";
import { safeUserText } from "@/lib/admin-users";
import { loadLeaderboardAggregateMap } from "@/lib/player-leaderboard-stats";
import {
  mergePublicUserRecord,
  normalizePublicUserStatus,
  type PublicUserRow
} from "@/lib/public-users";
import { normalizePlayerHandle } from "@/lib/player-auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminRoute("users:read");
  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();

  let authUsers: User[];
  let profiles: PublicUserRow[] | null;
  let profilesError: { message: string } | null;
  let groups: Awaited<ReturnType<typeof loadLeaderboardAggregateMap>>["groups"];

  try {
    const [allAuthUsers, profilesResult, aggregates] = await Promise.all([
      listAllAuthUsers(supabase),
      supabase
        .from("player_profiles")
        .select("id, full_name, handle, status, is_tester, tester_poll_id, crypto_wallets, created_at, updated_at")
        .order("created_at", { ascending: false }),
      loadLeaderboardAggregateMap(supabase)
    ]);
    authUsers = allAuthUsers;
    profiles = profilesResult.data as PublicUserRow[] | null;
    profilesError = profilesResult.error;
    groups = aggregates.groups;
  } catch (authError) {
    return auth.finish(
      NextResponse.json(
        { error: authError instanceof Error ? authError.message : "Failed to list users." },
        { status: 500 }
      )
    );
  }

  if (profilesError) {
    return auth.finish(
      NextResponse.json(
        {
          error: profilesError.message.includes("player_profiles")
            ? "Missing player_profiles table. Apply the player portal migrations."
            : profilesError.message
        },
        { status: 500 }
      )
    );
  }

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  const statsByUserId = new Map(
    [...groups.entries()].map(([userId, row]) => [
      userId,
      { pollsTaken: row.answersCount, pointsEarned: row.tokensEarned }
    ])
  );

  const users = ((profiles ?? []) as PublicUserRow[])
    .map((profile) => {
      const authUser = authUsersById.get(profile.id);
      return authUser ? mergePublicUserRecord(authUser, profile, statsByUserId.get(profile.id)) : null;
    })
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return auth.finish(NextResponse.json({ users }));
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("users:write");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    handle?: unknown;
    status?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const password = safeUserText(body.password, 255);
  const fullName = safeUserText(body.fullName, 255);
  const handle = normalizePlayerHandle(body.handle, email);
  const status = normalizePublicUserStatus(body.status);

  if (!email || !email.includes("@")) {
    return auth.finish(NextResponse.json({ error: "A valid email is required." }, { status: 400 }));
  }

  if (!password || password.length < 8) {
    return auth.finish(NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      handle
    }
  });

  if (createError || !createdUser.user) {
    return auth.finish(
      NextResponse.json({ error: createError?.message ?? "Failed to create player user." }, { status: 500 })
    );
  }

  const timestamp = new Date().toISOString();
  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .upsert({
      id: createdUser.user.id,
      full_name: fullName,
      handle,
      status,
      updated_at: timestamp
    })
    .select("id, full_name, handle, status, created_at, updated_at")
    .single();

  if (profileError || !profile) {
    return auth.finish(
      NextResponse.json(
        { error: profileError?.message ?? "Auth user was created, but the player profile could not be saved." },
        { status: 500 }
      )
    );
  }

  return auth.finish(
    NextResponse.json(
      { user: mergePublicUserRecord(createdUser.user, profile as PublicUserRow) },
      { status: 201 }
    )
  );
}
