import {
  fetchPlayerProfileRow,
  isMissingPlayerSchemaError,
  normalizePlayerHandle,
  safePlayerText,
  type PlayerProfileRow
} from "@/lib/player-auth";
export { getPublicPlayerProfilePath } from "@/lib/public-player-profile-path";
import { normalizeAvatarUrl, parsePlayerSocialLinks, type PlayerSocialLinks } from "@/lib/player-profile";
import { PLAYER_SOCIAL_FIELD_CONFIG, type PlayerSocialFieldKey } from "@/lib/player-social-handles";
import { createAdminClient } from "@/lib/supabase-admin";

export type PublicPlayerAnswer = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export type PublicPlayerProfile = {
  id: string;
  handle: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  socialLinks: PlayerSocialLinks;
  pollsTaken: number;
  pointsEarned: number;
  leaderboardRank: number | null;
  shareProfile: boolean;
  sharePollResponses: boolean;
  isOwnerView: boolean;
  showPollResponses: boolean;
  recentAnswers: PublicPlayerAnswer[];
};

export type PublicPlayerProfileLookup =
  | { status: "not_found" }
  | { status: "private" }
  | { status: "ok"; profile: PublicPlayerProfile };

type PollOptionRow = {
  id: string;
  label: string | null;
};

type ResponseRow = {
  id: string;
  poll_id: string;
  option_id: string;
  tokens_earned: number | null;
  polls:
    | {
        question: string | null;
        category: string | null;
        poll_options: PollOptionRow[] | PollOptionRow | null;
      }
    | Array<{
        question: string | null;
        category: string | null;
        poll_options: PollOptionRow[] | PollOptionRow | null;
      }>
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function isPublicSocialHref(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function getPublicSocialLinkEntries(links: PlayerSocialLinks) {
  return PLAYER_SOCIAL_FIELD_CONFIG.flatMap((field) => {
    const value = safePlayerText(links[field.key], 500);

    if (!value) {
      return [];
    }

    return [
      {
        key: field.key as PlayerSocialFieldKey,
        label: field.label,
        value,
        href: isPublicSocialHref(value) ? value : null
      }
    ];
  });
}

function mapResponseRows(rows: ResponseRow[]): PublicPlayerAnswer[] {
  return rows.map((row) => {
    const poll = firstRelation(row.polls);
    const rawOptions = poll?.poll_options;
    const optionRows = Array.isArray(rawOptions) ? rawOptions : rawOptions ? [rawOptions] : [];
    const selectedOption = optionRows.find((option) => option.id === row.option_id);

    return {
      id: row.id,
      question: poll?.question?.trim() || "Untitled poll",
      answer: selectedOption?.label?.trim() || "Unknown answer",
      category: poll?.category?.trim() || "General"
    };
  });
}

type LeaderboardAggregateRow = {
  playerId: string;
  tokensEarned: number;
  answersCount: number;
  firstAnsweredAt: string;
};

async function loadLeaderboardRank(playerId: string): Promise<number | null> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("poll_response")
    .select("user_id, tokens_earned, created_at")
    .not("user_id", "is", null);

  if (error || !rows?.length) {
    return null;
  }

  const leaderboardGroups = new Map<string, LeaderboardAggregateRow>();

  for (const row of rows) {
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

  const leaderboardTotals = [...leaderboardGroups.values()].sort((a, b) => {
    if (b.tokensEarned !== a.tokensEarned) {
      return b.tokensEarned - a.tokensEarned;
    }

    if (b.answersCount !== a.answersCount) {
      return b.answersCount - a.answersCount;
    }

    return a.firstAnsweredAt.localeCompare(b.firstAnsweredAt);
  });

  const rankIndex = leaderboardTotals.findIndex((entry) => entry.playerId === playerId);

  return rankIndex >= 0 ? rankIndex + 1 : null;
}

function buildPublicProfile(
  profile: PlayerProfileRow,
  viewerId: string | null | undefined,
  answers: PublicPlayerAnswer[],
  pointsEarned: number,
  leaderboardRank: number | null
): PublicPlayerProfile {
  const fullName = safePlayerText(profile.full_name, 255) || safePlayerText(profile.handle, 40) || "Normie Player";
  const handle = safePlayerText(profile.handle, 40);
  const shareProfile = Boolean(profile.share_profile);
  const sharePollResponses = Boolean(profile.share_poll_responses);
  const isOwnerView = Boolean(viewerId && viewerId === profile.id);

  return {
    id: profile.id,
    handle,
    fullName,
    avatarUrl: normalizeAvatarUrl(profile.avatar_url),
    bio: safePlayerText(profile.bio, 500),
    socialLinks: parsePlayerSocialLinks(profile.social_links),
    pollsTaken: answers.length,
    pointsEarned,
    leaderboardRank,
    shareProfile,
    sharePollResponses,
    isOwnerView,
    showPollResponses: sharePollResponses || isOwnerView,
    recentAnswers: sharePollResponses || isOwnerView ? answers.slice(0, 12) : []
  };
}

async function loadPlayerAnswers(userId: string): Promise<{
  answers: PublicPlayerAnswer[];
  pointsEarned: number;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("poll_response")
    .select(
      "id, poll_id, option_id, tokens_earned, polls(question, category, poll_options(id, label))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { answers: [], pointsEarned: 0 };
  }

  const rows = (data ?? []) as unknown as ResponseRow[];
  const answers = mapResponseRows(rows);
  const pointsEarned = rows.reduce((sum, row) => sum + (row.tokens_earned ?? 0), 0);

  return { answers, pointsEarned };
}

export async function getPublicPlayerProfileByHandle(
  rawHandle: string,
  viewerId?: string | null
): Promise<PublicPlayerProfileLookup> {
  const handle = normalizePlayerHandle(rawHandle);

  if (!handle) {
    return { status: "not_found" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("handle", handle)
    .eq("status", "active")
    .maybeSingle();

  if (isMissingPlayerSchemaError(error)) {
    return { status: "not_found" };
  }

  if (error || !data) {
    return { status: "not_found" };
  }

  const profile = await fetchPlayerProfileRow(data.id, { includeExtended: true });

  if (!profile) {
    return { status: "not_found" };
  }

  const isOwnerView = Boolean(viewerId && viewerId === profile.id);
  const shareProfile = Boolean(profile.share_profile);

  if (!shareProfile && !isOwnerView) {
    return { status: "private" };
  }

  const [{ answers, pointsEarned }, leaderboardRank] = await Promise.all([
    loadPlayerAnswers(profile.id),
    loadLeaderboardRank(profile.id)
  ]);

  return {
    status: "ok",
    profile: buildPublicProfile(profile, viewerId, answers, pointsEarned, leaderboardRank)
  };
}
