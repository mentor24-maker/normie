import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const SESSION_COOKIE = "poll_session_id";
const DISPLAY_VOTE_MULTIPLIER = 1327;

export async function GET() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  const supabase = createAdminClient();

  const [{ data: polls, error: pollsError }, { data: responses, error: responseError }] =
    await Promise.all([
      supabase
        .from("polls")
        .select("id, question, order_index, is_published, poll_options(id, label, sort_order)")
        .eq("is_published", true)
        .order("order_index", { ascending: true }),
      supabase.from("responses").select("poll_id").eq("session_id", sessionId)
    ]);

  if (pollsError || responseError) {
    return NextResponse.json(
      { error: pollsError?.message ?? responseError?.message ?? "Failed to load polls" },
      { status: 500 }
    );
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
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    const counts = new Map<string, number>();

    for (const row of totals ?? []) {
      counts.set(row.option_id, (counts.get(row.option_id) ?? 0) + 1);
    }

    previousPollResults = {
      id: previousPoll.id,
      question: previousPoll.question,
      totalResponses: (totals ?? []).length * DISPLAY_VOTE_MULTIPLIER,
      options: previousPoll.poll_options.map((option) => {
        const votes = counts.get(option.id) ?? 0;
        return {
          id: option.id,
          label: option.label,
          votes: votes * DISPLAY_VOTE_MULTIPLIER,
          percentage: (totals ?? []).length === 0 ? 0 : Math.round((votes / (totals ?? []).length) * 100)
        };
      })
    };
  }

  const response = NextResponse.json({
    done: false,
    currentPoll: {
      id: currentPoll.id,
      question: currentPoll.question,
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
}
