import { cookies } from "next/headers";
import { getPollCategoryMeta, pollCategorySlugMatchesAny } from "@/lib/poll-categories";
import { findPollCategoryByParam } from "@/lib/poll-category-store";
import { loadPollDeepDiveContent } from "@/lib/load-poll-deep-dive-content";
import { getPublicPollSettings, pollSettingsToClientPayload } from "@/lib/poll-settings";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPreferences } from "@/lib/player-preferences";
import { getUnlockedFeatureKeys } from "@/lib/player-unlocked-features";
import { loadPlayerPollReaction, type PollReactionKind } from "@/lib/poll-reaction";
import { countProgressPolls } from "@/lib/player-poll-stats";
import { POLL_PUBLIC_SELECT } from "@/lib/poll-select";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";
import {
  buildAnsweredPollIdSet,
  filterResponsesToEligiblePolls
} from "@/lib/poll-response-eligibility";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";
import { jsonWithPollSession } from "@/lib/poll-session-response";
import {
  excludePinnedPollFromAnswered,
  isPollTestModeRequest,
  readPollTestPin,
  readPollTestProgress
} from "@/lib/poll-test-mode";
import { pickRandomUnansweredPoll, resolveMostRecentAnsweredPoll, shuffleForDisplay } from "@/lib/polls-next-session";
import { mapPollRowWithCategory } from "@/lib/poll-category-store";

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

  const supabase = createPublicClient();
  const supabaseAdmin = createAdminClient();
  const settingsPromise = getPublicPollSettings();
  const categoryRecord = categoryParam ? await findPollCategoryByParam(supabaseAdmin, categoryParam) : null;
  const activeCategory = categoryRecord
    ? getPollCategoryMeta(categoryRecord.slug, [categoryRecord])
    : categoryParam
      ? null
      : null;

  const START_POLL_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let pollsQuery = supabase
    .from("polls")
    .select(POLL_PUBLIC_SELECT)
    .eq("is_published", true)
    .eq("is_hidden", false)
    .order("order_index", { ascending: true });

  if (categoryParam) {
    if (!categoryRecord) {
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

    pollsQuery = pollsQuery.eq("category_id", categoryRecord.id);
  }

  const responsesQuery = supabase
    .from("poll_response")
    .select("poll_id, created_at, is_skipped")
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
      context: { category: categoryRecord?.slug ?? null }
    });
  }

  let orderedPolls = (polls ?? []).map((poll) => {
    const mapped = mapPollRowWithCategory(poll);

    return {
      ...mapped,
      poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    };
  });

  const preferences = player && !categoryParam ? await getPlayerPreferences(player) : null;
  const usesPreferenceFilter = Boolean(preferences && preferences.preferredPollCategories.length > 0);

  if (usesPreferenceFilter && preferences) {
    orderedPolls = orderedPolls.filter((poll) =>
      pollCategorySlugMatchesAny(poll.category_slug, preferences.preferredPollCategories)
    );
  }

  const eligiblePollIds = new Set(orderedPolls.map((poll) => poll.id));
  const eligibleResponses = filterResponsesToEligiblePolls(responses ?? [], eligiblePollIds);
  const answeredPollIds = buildAnsweredPollIdSet(eligibleResponses, eligiblePollIds);

  let unlockedFeatures: string[] = [];

  if (player) {
    const [{ data: rewards, error: rewardsError }, { data: features, error: featuresError }] = await Promise.all([
      supabaseAdmin.from("game_rewards").select("reward_type, status, metadata").eq("status", "active"),
      supabaseAdmin.from("game_progressive_features").select("feature_key, is_active").eq("is_active", true)
    ]);

    if (!rewardsError && !featuresError) {
      unlockedFeatures = getUnlockedFeatureKeys(countProgressPolls(responses ?? []), rewards ?? [], features ?? []);
    }
  }

  let currentPoll = pickRandomUnansweredPoll(orderedPolls, answeredPollIds);

  if (startPollParam && START_POLL_UUID.test(startPollParam)) {
    const forced = orderedPolls.find((poll) => poll.id === startPollParam);

    if (forced) {
      currentPoll = forced;
    }
  }

  const pollTestModeActive = isPollTestModeRequest(request, cookieStore);
  let pollTestPin: string | null = null;
  let pollTestProgress: number | null = null;

  if (pollTestModeActive) {
    const fallbackProgress = countProgressPolls(eligibleResponses);
    pollTestProgress = readPollTestProgress(cookieStore) ?? fallbackProgress;
    pollTestPin = readPollTestPin(cookieStore) ?? currentPoll?.id ?? null;

    if (!pollTestPin && startPollParam && START_POLL_UUID.test(startPollParam)) {
      pollTestPin = startPollParam;
    }

    if (pollTestPin) {
      const pinned = orderedPolls.find((poll) => poll.id === pollTestPin);

      if (pinned) {
        currentPoll = pinned;
      }
    }

    if (pollTestPin) {
      excludePinnedPollFromAnswered(answeredPollIds, pollTestPin);
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
    if (categoryParam && !categoryRecord) {
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
        settings: settingsPayload,
        unlockedFeatures
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
      .eq("poll_id", previousPoll.id)
      .or("is_skipped.is.null,is_skipped.eq.false");

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
        category_id: previousPoll.category_id,
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
      category: previousPoll.category,
      totalResponses: pollResults.totalResponses,
      options: pollResults.options,
      deepDive,
      playerReaction: player
        ? await loadPlayerPollReaction(supabaseAdmin, player.authUser.id, previousPoll.id)
        : null
    };
  }

  return jsonWithPollSession(
    {
      done: false,
      activeCategory,
      currentPoll: {
        id: currentPoll.id,
        question: currentPoll.question,
        category: currentPoll.category,
        imageUrl: currentPoll.image_url ?? "",
        options: shuffleForDisplay(currentPoll.poll_options).map((option) => ({
          id: option.id,
          label: option.label
        }))
      },
      previousPoll: previousPollResults,
      settings: settingsPayload,
      unlockedFeatures,
      pollTestMode: pollTestModeActive,
      pollTestPin: pollTestPin ?? undefined
    },
    sessionId,
    undefined,
    pollTestModeActive
      ? {
          enabled: true,
          pinPollId: pollTestPin ?? currentPoll.id,
          progress: pollTestProgress
        }
      : undefined
  );
});
