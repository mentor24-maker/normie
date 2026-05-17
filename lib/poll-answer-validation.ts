import { createPublicClient } from "@/lib/supabase-public";
import { isUuid } from "@/lib/public-request";

export type PollAnswerValidationResult =
  | { ok: true; pollId: string; optionId: string }
  | { ok: false; error: string; status: number };

export async function validatePollAnswerSubmission(
  pollId: string,
  optionId: string
): Promise<PollAnswerValidationResult> {
  if (!isUuid(pollId) || !isUuid(optionId)) {
    return { ok: false, error: "Invalid poll or option identifier.", status: 400 };
  }

  const supabase = createPublicClient();
  const { data: poll, error } = await supabase
    .from("polls")
    .select("id, is_published, poll_options(id)")
    .eq("id", pollId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (!poll) {
    return { ok: false, error: "This poll is not available.", status: 404 };
  }

  const optionIds = new Set((poll.poll_options ?? []).map((option) => option.id));

  if (!optionIds.has(optionId)) {
    return { ok: false, error: "The selected option is not valid for this poll.", status: 400 };
  }

  return { ok: true, pollId, optionId };
}
