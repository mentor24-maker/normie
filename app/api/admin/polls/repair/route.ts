import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { ensurePollCategory, mapPollRowWithCategory } from "@/lib/poll-category-store";
import { POLL_REPAIR_SELECT } from "@/lib/poll-select";
import { createAdminClient } from "@/lib/supabase-admin";

type PollOptionRow = {
  id: string;
  label: string;
  sort_order: number;
};

type PollRow = {
  id: string;
  category: string | null;
  category_id: string | null;
  question: string;
  order_index: number;
  poll_options: PollOptionRow[];
};

function safeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function getRepairCandidate(poll: PollRow) {
  const category = safeText(poll.category);
  const legacyCategory = safeText(poll.question);
  const options = [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const firstOption = options[0];

  if (poll.category_id || category) {
    return null;
  }

  if (!legacyCategory || options.length < 3 || !firstOption) {
    return null;
  }

  return {
    id: poll.id,
    orderIndex: poll.order_index,
    currentQuestion: poll.question,
    derivedCategory: legacyCategory,
    derivedQuestion: firstOption.label,
    currentOptionCount: options.length,
    remainingOptionCount: options.length - 1
  };
}

async function listRepairCandidates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .select(POLL_REPAIR_SELECT)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as PollRow[])
    .map((poll) =>
      mapPollRowWithCategory({
        ...poll,
        poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      })
    )
    .map(getRepairCandidate)
    .filter((candidate): candidate is NonNullable<ReturnType<typeof getRepairCandidate>> => Boolean(candidate));
}

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const candidates = await listRepairCandidates();
    return auth.finish(NextResponse.json({ candidates, count: candidates.length }));
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to inspect poll structure." },
      { status: 500 }
    ));
  }
}

export async function POST() {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("polls")
      .select(POLL_REPAIR_SELECT)
      .order("order_index", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const polls = ((data ?? []) as unknown as PollRow[]).map((poll) =>
      mapPollRowWithCategory({
        ...poll,
        poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      })
    );

    let repairedCount = 0;

    for (const poll of polls) {
      const candidate = getRepairCandidate(poll);

      if (!candidate) {
        continue;
      }

      const [questionOption, ...answerOptions] = poll.poll_options;
      const categoryRecord = await ensurePollCategory(supabase, candidate.derivedCategory);

      const { error: pollUpdateError } = await supabase
        .from("polls")
        .update({
          category_id: categoryRecord?.id ?? null,
          question: candidate.derivedQuestion
        })
        .eq("id", poll.id);

      if (pollUpdateError) {
        throw new Error(pollUpdateError.message);
      }

      if (answerOptions.length > 0) {
        const { error: optionsUpdateError } = await supabase.from("poll_options").upsert(
          answerOptions.map((option, index) => ({
            id: option.id,
            poll_id: poll.id,
            label: option.label,
            sort_order: index + 1
          }))
        );

        if (optionsUpdateError) {
          throw new Error(optionsUpdateError.message);
        }
      }

      const { error: deleteError } = await supabase.from("poll_options").delete().eq("id", questionOption.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      repairedCount += 1;
    }

    return auth.finish(NextResponse.json({ ok: true, repairedCount }));
  } catch (error) {
    return auth.finish(NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to repair legacy poll structure." },
      { status: 500 }
    ));
  }
}
