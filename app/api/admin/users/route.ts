import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeUserText } from "@/lib/admin-users";
import {
  mergePublicUserRecord,
  normalizePublicUserStatus,
  type PublicUserRow
} from "@/lib/public-users";
import { normalizePlayerHandle } from "@/lib/player-auth";
import { countProgressPolls, isProgressPollResponse, sumPointsEarned } from "@/lib/player-poll-stats";
import { fetchReactionPointsByUserId } from "@/lib/poll-reaction";
import { createAdminClient } from "@/lib/supabase-admin";

type ResponseStatsRow = {
  user_id: string | null;
  tokens_earned: number | null;
  is_skipped: boolean | null;
};

function buildStatsByUserId(rows: ResponseStatsRow[]) {
  const stats = new Map<string, { pollsTaken: number; pointsEarned: number }>();

  for (const row of rows) {
    if (!row.user_id) continue;

    const current = stats.get(row.user_id) ?? { pollsTaken: 0, pointsEarned: 0 };
    if (isProgressPollResponse(row)) {
      current.pollsTaken += 1;
    }
    current.pointsEarned += row.tokens_earned ?? 0;
    stats.set(row.user_id, current);
  }

  return stats;
}

export async function GET() {
  const auth = await requireAdminRoute("users:read");
  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();
  const [{ data: authData, error: authError }, { data: profiles, error: profilesError }, { data: responses, error: responsesError }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase
        .from("player_profiles")
        .select("id, full_name, handle, status, crypto_wallets, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase.from("poll_response").select("user_id, tokens_earned, is_skipped").not("user_id", "is", null)
    ]);

  if (authError) {
    return auth.finish(NextResponse.json({ error: authError.message }, { status: 500 }));
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

  if (responsesError) {
    return auth.finish(NextResponse.json({ error: responsesError.message }, { status: 500 }));
  }

  const authUsersById = new Map<string, User>(((authData?.users ?? []) as User[]).map((user) => [user.id, user]));
  const statsByUserId = buildStatsByUserId((responses ?? []) as ResponseStatsRow[]);
  const reactionPointsByUser = await fetchReactionPointsByUserId(supabase);

  for (const [userId, reactionPoints] of reactionPointsByUser) {
    const current = statsByUserId.get(userId) ?? { pollsTaken: 0, pointsEarned: 0 };
    current.pointsEarned += reactionPoints;
    statsByUserId.set(userId, current);
  }

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
