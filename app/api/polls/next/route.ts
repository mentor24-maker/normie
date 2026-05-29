import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPollCategoryMeta, resolvePollCategoryName } from "@/lib/poll-categories";
import { loadPollDeepDiveContent } from "@/lib/load-poll-deep-dive-content";
import { getPublicPollSettings, pollSettingsToClientPayload } from "@/lib/poll-settings";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPreferences } from "@/lib/player-preferences";
import { createPublicClient } from "@/lib/supabase-public";
import {
  buildAnsweredPollIdSet,
  filterResponsesToEligiblePolls
} from "@/lib/poll-response-eligibility";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { jsonWithPollSession } from "@/lib/poll-session-response";
import { pickRandomUnansweredPoll, resolveMostRecentAnsweredPoll } from "@/lib/polls-next-session";

function getPollResults(
  options: Array<{ id: string; label: string }>,
  counts: Map<string, number>
) {
  const votes = options.map((option) => counts.get(option.id) ?? 0);
  const totalResponses = votes.reduce((sum, count) => sum + count, 0);

  return {
    totalResponses,
    options: options.map((option, index) => ({
      id: option.id,
      label: option.label,
      votes: votes[index] ?? 0,
      percentage:
        totalResponses === 0 ? 0 : Math.round(((votes[index] ?? 0) / totalResponses) * 100)
    }))
  };
}

export const GET = withObservedRoute("polls.next", async (request) => {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(POLL_SESSION_COOKIE)?.value;
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  const categoryParam = new URL(request.url).searchParams.get("category")?.trim() || "";
  const startPollParam = new URL(request.url).searchParams.get("startPoll")?.trim() || "";
  const categoryFilter = categoryParam ? resolvePollCategoryName(categoryParam) : null;
  const activeCategory = categoryParam ? getPollCategoryMeta(categoryParam) : null;

  const START_POLL_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const supabase = createPublicClient();
  const settingsPromise = getPublicPollSettings();

  let pollsQuery = supabase
    .from("polls")
    .select(
      "id, question, deep_dive, deep_dive_youtube_url, deep_dive_blog_post_id, deep_dive_related_poll_ids, category, image_url, order_index, is_published, poll_options(id, label, sort_order)"
    )
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (categoryParam) {
    if (!categoryFilter) {
      const settings = await settingsPromise;
      return jsonWithPollSession(
        {
          done: true,
          doneReason: "invalid_category",
          activeCategory: null,
          currentPoll: null,
          previousPoll: null,
          settings: pollSettingsToClientPayload(settings)
        },
        sessionId
      );
    }

    pollsQuery = pollsQuery.eq("category", categoryFilter);
  }

  const responsesQuery = supabase
    .from("poll_response")
    .select("poll_id, created_at")
    .order("created_at", { ascending: false });
  const playerResponsesQuery = player
    ? responsesQuery.eq("user_id", player.authUser.id)
    : responsesQuery.eq("session_id", sessionId);

  const [
    { data: polls, error: pollsError },
    { data: responses, error: responseError },
    pollSettings
  ] = await Promise.all([
    pollsQuery,
    playerResponsesQuery,
    settingsPromise
  ]);
  const settingsPayload = pollSettingsToClientPayload(pollSettings);

  if (pollsError || responseError) {
    return publicErrorResponse(request, {
      logEvent: "polls.next.load_failed",
      error: pollsError ?? responseError,
      message: "Failed to load polls.",
      context: { category: categoryFilter || null }
    });
  }

  let orderedPolls = (polls ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }));

  const preferences = player && !categoryParam ? await getPlayerPreferences(player) : null;
  const usesPreferenceFilter = Boolean(preferences && preferences.preferredPollCategories.length > 0);

  if (usesPreferenceFilter && preferences) {
    const allowed = new Set(preferences.preferredPollCategories);
    orderedPolls = orderedPolls.filter((poll) => allowed.has(poll.category?.trim() ?? ""));
  }

  const eligiblePollIds = new Set(orderedPolls.map((poll) => poll.id));
  const eligibleResponses = filterResponsesToEligiblePolls(responses ?? [], eligiblePollIds);
  const answeredPollIds = buildAnsweredPollIdSet(eligibleResponses, eligiblePollIds);

  let currentPoll = pickRandomUnansweredPoll(orderedPolls, answeredPollIds);

  if (startPollParam && START_POLL_UUID.test(startPollParam)) {
    const forced = orderedPolls.find((poll) => poll.id === startPollParam);

    if (forced) {
      currentPoll = forced;
    }
  }

  let doneReason:
    | "all_answered"
    | "all_answered_in_category"
    | "all_answered_in_preferences"
    | "no_polls_available"
    | "no_polls_in_category"
    | "no_polls_matching_preferences"
    | "invalid_category"
    | null = null;

  if (!currentPoll) {
    if (categoryParam && !categoryFilter) {
      doneReason = "invalid_category";
    } else if (orderedPolls.length === 0) {
      doneReason = usesPreferenceFilter
        ? "no_polls_matching_preferences"
        : categoryParam
          ? "no_polls_in_category"
          : "no_polls_available";
    } else if (categoryParam) {
      doneReason = "all_answered_in_category";
    } else if (usesPreferenceFilter) {
      doneReason = "all_answered_in_preferences";
    } else {
      doneReason = "all_answered";
    }
  }

  if (!currentPoll) {
    return jsonWithPollSession(
      {
        done: true,
        doneReason: doneReason ?? "all_answered",
        activeCategory,
        currentPoll: null,
        previousPoll: null,
        settings: settingsPayload
      },
      sessionId
    );
  }

  const isStartPollPendingPreview =
    Boolean(startPollParam) &&
    START_POLL_UUID.test(startPollParam) &&
    startPollParam === currentPoll.id &&
    !answeredPollIds.has(currentPoll.id);

  const previousPoll = resolveMostRecentAnsweredPoll(
    orderedPolls,
    eligibleResponses,
    isStartPollPendingPreview ? currentPoll.id : null
  );

  let previousPollResults = null;

  if (previousPoll && !isStartPollPendingPreview) {
    const { data: totals, error: totalsError } = await supabase
      .from("poll_response")
      .select("option_id")
      .eq("poll_id", previousPoll.id);

    if (totalsError) {
      return publicErrorResponse(request, {
        logEvent: "polls.next.previous_results_failed",
        error: totalsError,
        message: "Failed to load poll results.",
        context: { pollId: previousPoll.id }
      });
    }

    const counts = new Map<string, number>();

    for (const row of totals ?? []) {
      counts.set(row.option_id, (counts.get(row.option_id) ?? 0) + 1);
    }

    const pollResults = getPollResults(previousPoll.poll_options, counts);

    const deepDive = await loadPollDeepDiveContent(
      supabase,
      {
        id: previousPoll.id,
        question: previousPoll.question,
        category: previousPoll.category,
        deep_dive: previousPoll.deep_dive,
        deep_dive_youtube_url: previousPoll.deep_dive_youtube_url,
        deep_dive_blog_post_id: previousPoll.deep_dive_blog_post_id,
        deep_dive_related_poll_ids: previousPoll.deep_dive_related_poll_ids
      },
      { excludePollIds: [currentPoll.id] }
    );

    previousPollResults = {
      id: previousPoll.id,
      question: previousPoll.question,
      totalResponses: pollResults.totalResponses,
      options: pollResults.options,
      deepDive
    };
  }

  return jsonWithPollSession(
    {
      done: false,
      activeCategory,
      currentPoll: {
        id: currentPoll.id,
        question: currentPoll.question,
        imageUrl: currentPoll.image_url ?? "",
        options: currentPoll.poll_options.map((option) => ({
          id: option.id,
          label: option.label
        }))
      },
      previousPoll: previousPollResults,
      settings: settingsPayload
    },
    sessionId
  );
});
