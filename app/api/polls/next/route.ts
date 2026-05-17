import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/observability/report-error";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { createPublicClient } from "@/lib/supabase-public";

const SESSION_COOKIE = "poll_session_id";
const DISPLAY_VOTE_MULTIPLIER = 1327;
const ZERO_COUNT_RATIO = 0.37;

function getDisplayVoteOffset(seed: string) {
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return (hash % 100) + 1;
}

function getDisplayPollResults(
  pollId: string,
  options: Array<{ id: string; label: string }>,
  counts: Map<string, number>
) {
  const baseVotes = options.map((option) => ({
    id: option.id,
    label: option.label,
    votes: (counts.get(option.id) ?? 0) * DISPLAY_VOTE_MULTIPLIER
  }));

  const adjustedBaseVotes = baseVotes.map((option, index) => {
    if (option.votes > 0) {
      return option.votes;
    }

    const otherVotes = baseVotes
      .filter((_, otherIndex) => otherIndex !== index)
      .map((otherOption) => otherOption.votes);
    const largestOtherVote = Math.max(...otherVotes, 0);

    return largestOtherVote > 0 ? Math.round(largestOtherVote * ZERO_COUNT_RATIO) : 0;
  });

  const displayVotes = adjustedBaseVotes.map((votes, index) =>
    votes + getDisplayVoteOffset(`${pollId}:${options[index]?.id ?? index}`)
  );
  const totalResponses = displayVotes.reduce((sum, votes) => sum + votes, 0);

  return {
    totalResponses,
    options: options.map((option, index) => ({
      id: option.id,
      label: option.label,
      votes: displayVotes[index] ?? 0,
      percentage:
        totalResponses === 0
          ? 0
          : Math.round(((displayVotes[index] ?? 0) / totalResponses) * 100)
    }))
  };
}

export const GET = withObservedRoute("polls.next", async (request) => {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  const category = new URL(request.url).searchParams.get("category")?.trim() || "";

  const supabase = createPublicClient();

  let pollsQuery = supabase
    .from("polls")
    .select("id, question, category, image_url, order_index, is_published, poll_options(id, label, sort_order)")
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (category) {
    pollsQuery = pollsQuery.eq("category", category);
  }

  const [{ data: polls, error: pollsError }, { data: responses, error: responseError }] =
    await Promise.all([
      pollsQuery,
      supabase.from("responses").select("poll_id").eq("session_id", sessionId)
    ]);

  if (pollsError || responseError) {
    return publicErrorResponse(request, {
      logEvent: "polls.next.load_failed",
      error: pollsError ?? responseError,
      message: "Failed to load polls.",
      context: { category: category || null }
    });
  }

  const answeredPollIds = new Set((responses ?? []).map((response) => response.poll_id));
  const orderedPolls = (polls ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }));

  const currentIndex = orderedPolls.findIndex((poll) => !answeredPollIds.has(poll.id));

  if (currentIndex === -1) {
    const doneResponse = NextResponse.json({ done: true, currentPoll: null, previousPoll: null });
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

  let previousPollResults = null;

  if (previousPoll) {
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

    const displayResults = getDisplayPollResults(previousPoll.id, previousPoll.poll_options, counts);

    previousPollResults = {
      id: previousPoll.id,
      question: previousPoll.question,
      totalResponses: displayResults.totalResponses,
      options: displayResults.options
    };
  }

  const response = NextResponse.json({
    done: false,
    currentPoll: {
      id: currentPoll.id,
      question: currentPoll.question,
      imageUrl: currentPoll.image_url ?? "",
      options: currentPoll.poll_options.map((option) => ({
        id: option.id,
        label: option.label
      }))
    },
    previousPoll: previousPollResults
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
