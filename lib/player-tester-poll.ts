import type { PollAnswerValidationResult } from "@/lib/poll-answer-validation";
import { mapPollRowWithCategory } from "@/lib/poll-category-store";
import { POLL_PUBLIC_SELECT } from "@/lib/poll-select";
import { isUuid } from "@/lib/public-request";
import { createAdminClient } from "@/lib/supabase-admin";

export type PlayerTesterPollSettings = {
  isTester: boolean;
  testerPollId: string | null;
};

export type TesterPollRow = {
  id: string;
  question: string;
  deep_dive: string | null;
  deep_dive_youtube_url: string | null;
  deep_dive_blog_post_id: string | null;
  deep_dive_related_poll_ids: string[] | null;
  category_id: string | null;
  category: string | null;
  category_slug: string | null;
  image_url: string | null;
  order_index: number;
  is_published: boolean;
  poll_options: Array<{ id: string; label: string; sort_order: number }>;
};

export function normalizeIsTester(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const candidate = String(value ?? "")
    .trim()
    .toLowerCase();

  return candidate === "1" || candidate === "true" || candidate === "yes" || candidate === "on";
}

export function normalizeTesterPollId(value: unknown): string | null {
  const candidate = String(value ?? "").trim();
  return isUuid(candidate) ? candidate : null;
}

export function readPlayerTesterPollSettings(row: {
  is_tester?: boolean | null;
  tester_poll_id?: string | null;
}): PlayerTesterPollSettings {
  const isTester = Boolean(row.is_tester);
  const testerPollId = normalizeTesterPollId(row.tester_poll_id);

  return {
    isTester,
    testerPollId: isTester ? testerPollId : null
  };
}

export function resolvePlayerTesterPollPin(settings: PlayerTesterPollSettings): string | null {
  if (!settings.isTester) {
    return null;
  }

  return settings.testerPollId;
}

export async function loadPlayerTesterPollSettings(userId: string): Promise<PlayerTesterPollSettings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("player_profiles")
    .select("is_tester, tester_poll_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { isTester: false, testerPollId: null };
  }

  return readPlayerTesterPollSettings(data);
}

export async function loadPlayerTesterPollPin(userId: string): Promise<string | null> {
  const settings = await loadPlayerTesterPollSettings(userId);
  return resolvePlayerTesterPollPin(settings);
}

export async function loadPlayerTesterPollNumber(userId: string): Promise<number | null> {
  const settings = await loadPlayerTesterPollSettings(userId);

  if (!settings.isTester || !settings.testerPollId) {
    return null;
  }

  const poll = await loadTesterPollRow(settings.testerPollId);

  if (!poll || !Number.isFinite(poll.order_index) || poll.order_index <= 0) {
    return null;
  }

  return poll.order_index;
}

export function resolveTesterSimulatedProgressPolls(orderIndex: number): number | null {
  const parsed = Math.floor(Number(orderIndex));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export type TesterPollAnswerSimulation = {
  testerPollMode: true;
  testProgressOverride: number;
};

export async function buildTesterPollAnswerSimulation(
  pollId: string
): Promise<TesterPollAnswerSimulation | null> {
  const poll = await loadTesterPollRow(pollId);

  if (!poll) {
    return null;
  }

  const testProgressOverride = resolveTesterSimulatedProgressPolls(poll.order_index);

  if (!testProgressOverride) {
    return null;
  }

  return {
    testerPollMode: true,
    testProgressOverride
  };
}

export async function loadTesterPollRow(pollId: string): Promise<TesterPollRow | null> {
  if (!isUuid(pollId)) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("polls").select(POLL_PUBLIC_SELECT).eq("id", pollId).maybeSingle();

  if (error || !data) {
    return null;
  }

  const mapped = mapPollRowWithCategory(data);

  return {
    ...mapped,
    poll_options: [...(data.poll_options ?? [])].sort((left, right) => left.sort_order - right.sort_order)
  };
}

export function mergeTesterPollIntoList<T extends { id: string }>(polls: T[], testerPoll: T | null): T[] {
  if (!testerPoll) {
    return polls;
  }

  if (polls.some((poll) => poll.id === testerPoll.id)) {
    return polls;
  }

  return [...polls, testerPoll].sort((left, right) => {
    const leftOrder = "order_index" in left ? Number(left.order_index) : 0;
    const rightOrder = "order_index" in right ? Number(right.order_index) : 0;
    return leftOrder - rightOrder;
  });
}

export async function validateTesterPollAnswer(
  pollId: string,
  optionId: string
): Promise<PollAnswerValidationResult> {
  if (!isUuid(pollId) || !isUuid(optionId)) {
    return { ok: false, error: "Invalid poll or option identifier.", status: 400 };
  }

  const poll = await loadTesterPollRow(pollId);

  if (!poll) {
    return { ok: false, error: "This poll is not available.", status: 404 };
  }

  const optionIds = new Set(poll.poll_options.map((option) => option.id));

  if (!optionIds.has(optionId)) {
    return { ok: false, error: "The selected option is not valid for this poll.", status: 400 };
  }

  return { ok: true, pollId, optionId };
}

export async function assertTesterPollExists(pollId: string | null): Promise<string | null> {
  if (!pollId) {
    return "Choose a poll for this tester.";
  }

  const poll = await loadTesterPollRow(pollId);

  if (!poll) {
    return "The selected poll could not be found.";
  }

  return null;
}
