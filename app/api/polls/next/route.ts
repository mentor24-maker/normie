import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPollCategoryMeta, resolvePollCategoryName } from "@/lib/poll-categories";
import { loadPollDeepDiveContent } from "@/lib/load-poll-deep-dive-content";
import { getPublicPollSettings, pollSettingsToClientPayload } from "@/lib/poll-settings";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { createPublicClient } from "@/lib/supabase-public";
import { resolveCurrentPollIndexFromSession } from "@/lib/polls-next-session";

const SESSION_COOKIE = "poll_session_id";

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
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

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
      return NextResponse.json({
        done: true,
        activeCategory: null,
        currentPoll: null,
        previousPoll: null,
        settings: pollSettingsToClientPayload(settings)
      });
    }

    pollsQuery = pollsQuery.eq("category", categoryFilter);
  }

  const [
    { data: polls, error: pollsError },
    { data: responses, error: responseError },
    pollSettings
  ] = await Promise.all([
    pollsQuery,
    supabase.from("responses").select("poll_id").eq("session_id", sessionId),
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

  const answeredPollIds = new Set((responses ?? []).map((response) => response.poll_id));
  const orderedPolls = (polls ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }));

  const currentIndexFromSession = resolveCurrentPollIndexFromSession(orderedPolls, answeredPollIds);

  let currentIndex = currentIndexFromSession;
  if (startPollParam && START_POLL_UUID.test(startPollParam)) {
    const forced = orderedPolls.findIndex((poll) => poll.id === startPollParam);
    if (forced >= 0) {
      currentIndex = forced;
    }
  }

  if (currentIndex === -1) {
    const doneResponse = NextResponse.json({
      done: true,
      activeCategory,
      currentPoll: null,
      previousPoll: null,
      settings: settingsPayload
    });
    doneResponse.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
    return doneResponse;
  }

  const currentPoll = orderedPolls[currentIndex];
  const previousPoll = currentIndex > 0 ? orderedPolls[currentIndex - 1] : null;

  const isStartPollPendingPreview =
    Boolean(startPollParam) &&
    START_POLL_UUID.test(startPollParam) &&
    startPollParam === currentPoll.id &&
    !answeredPollIds.has(currentPoll.id);

  let previousPollResults = null;

  if (previousPoll && !isStartPollPendingPreview) {
    const { data: totals, error: totalsError } = await supabase
      .from("responses")
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

  const response = NextResponse.json({
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
  });

  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
});
