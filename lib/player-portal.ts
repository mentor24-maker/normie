import { createAdminClient } from "./supabase-admin";
import type { AuthorizedPlayer } from "./player-auth";

export type PlayerAnswer = {
  id: string;
  question: string;
  answer: string;
  category: string;
  tokensEarned: number;
  answeredAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  displayName: string;
  handle: string;
  answersCount: number;
  tokensEarned: number;
};

export type PlayerPortalSnapshot = {
  player: { id: string; email: string; fullName: string; handle: string };
  answers: PlayerAnswer[];
  tokensEarned: number;
  pollsTaken: number;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
};

type ResponseRow = {
  id: string;
  user_id: string | null;
  tokens_earned: number | null;
  created_at: string;
  polls:
    | { question: string | null; category: string | null }
    | Array<{ question: string | null; category: string | null }>
    | null;
  poll_options: { label: string | null } | Array<{ label: string | null }> | null;
};

type LeaderboardResponseRow = {
  user_id: string | null;
  tokens_earned: number | null;
  created_at: string | null;
};

type ProfileRelation = {
  id: string;
  full_name: string | null;
  handle: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function displayNameForProfile(fullName: string | null | undefined, handle: string | null | undefined) {
  return fullName?.trim() || handle?.trim() || "Normie Player";
}

export async function getPlayerPortalSnapshot(player: AuthorizedPlayer): Promise<PlayerPortalSnapshot> {
  const supabase = createAdminClient();
  const [{ data: responseRows, error: responsesError }, { data: leaderboardRows, error: leaderboardError }] =
    await Promise.all([
      supabase
        .from("responses")
        .select("id, user_id, tokens_earned, created_at, polls(question, category), poll_options(label)")
        .eq("user_id", player.authUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("responses")
        .select("user_id, tokens_earned, created_at")
        .not("user_id", "is", null)
    ]);

  if (responsesError) {
    throw new Error(responsesError.message);
  }

  if (leaderboardError) {
    throw new Error(leaderboardError.message);
  }

  const answers: PlayerAnswer[] = ((responseRows ?? []) as unknown as ResponseRow[]).map((row) => {
    const poll = firstRelation(row.polls);
    const option = firstRelation(row.poll_options);

    return {
      id: row.id,
      question: poll?.question ?? "Untitled poll",
      answer: option?.label ?? "Unknown answer",
      category: poll?.category ?? "General",
      tokensEarned: row.tokens_earned ?? 0,
      answeredAt: row.created_at
    };
  });

  const leaderboardGroups = new Map<
    string,
    { playerId: string; answersCount: number; tokensEarned: number; firstAnsweredAt: string }
  >();

  for (const row of (leaderboardRows ?? []) as unknown as LeaderboardResponseRow[]) {
    if (!row.user_id) {
      continue;
    }

    const createdAt = row.created_at ?? "";
    const existing = leaderboardGroups.get(row.user_id);

    if (existing) {
      existing.answersCount += 1;
      existing.tokensEarned += row.tokens_earned ?? 0;
      existing.firstAnsweredAt =
        createdAt && (!existing.firstAnsweredAt || createdAt < existing.firstAnsweredAt)
          ? createdAt
          : existing.firstAnsweredAt;
    } else {
      leaderboardGroups.set(row.user_id, {
        playerId: row.user_id,
        answersCount: 1,
        tokensEarned: row.tokens_earned ?? 0,
        firstAnsweredAt: createdAt
      });
    }
  }

  const leaderboardTotals = [...leaderboardGroups.values()]
    .sort((a, b) => {
      if (b.tokensEarned !== a.tokensEarned) {
        return b.tokensEarned - a.tokensEarned;
      }
      if (b.answersCount !== a.answersCount) {
        return b.answersCount - a.answersCount;
      }
      return a.firstAnsweredAt.localeCompare(b.firstAnsweredAt);
    })
    .slice(0, 25);

  const leaderboardPlayerIds = leaderboardTotals.map((row) => row.playerId);
  const { data: profileRows, error: profilesError } = leaderboardPlayerIds.length
    ? await supabase.from("player_profiles").select("id, full_name, handle").in("id", leaderboardPlayerIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(
    ((profileRows ?? []) as unknown as ProfileRelation[]).map((profile) => [profile.id, profile])
  );

  const leaderboard = leaderboardTotals.map((row, index) => {
    const profile = profilesById.get(row.playerId);

    return {
      rank: index + 1,
      playerId: row.playerId,
      displayName: displayNameForProfile(profile?.full_name, profile?.handle),
      handle: profile?.handle ?? "player",
      answersCount: row.answersCount,
      tokensEarned: row.tokensEarned
    };
  });

  const playerRank = leaderboard.find((entry) => entry.playerId === player.authUser.id)?.rank ?? null;
  const tokensEarned = answers.reduce((total, answer) => total + answer.tokensEarned, 0);

  return {
    player: {
      id: player.authUser.id,
      email: player.authUser.email ?? "",
      fullName: player.profile.full_name ?? "",
      handle: player.profile.handle ?? "player"
    },
    answers,
    tokensEarned,
    pollsTaken: answers.length,
    leaderboard,
    playerRank
  };
}
