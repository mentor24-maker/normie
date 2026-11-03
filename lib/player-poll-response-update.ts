import { createAdminClient } from "./supabase-admin";
import { isUuid } from "./public-request";

export type PollOptionUpdateValidation =
  | { ok: true; pollId: string; optionId: string }
  | { ok: false; error: string; status: number };

export async function validatePollOptionBelongsToPoll(
  pollId: string,
  optionId: string
): Promise<PollOptionUpdateValidation> {
  if (!isUuid(pollId) || !isUuid(optionId)) {
    return { ok: false, error: "Invalid poll or option identifier.", status: 400 };
  }

  const supabase = createAdminClient();
  const { data: option, error } = await supabase
    .from("poll_options")
    .select("id, poll_id")
    .eq("id", optionId)
    .eq("poll_id", pollId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (!option) {
    return { ok: false, error: "The selected option is not valid for this poll.", status: 400 };
  }

  return { ok: true, pollId, optionId };
}

export type UpdatePlayerResponseResult =
  | { ok: true; optionId: string; answer: string }
  | { ok: false; error: string; status: number };

export async function updatePlayerResponseOption(
  playerId: string,
  responseId: string,
  optionId: string
): Promise<UpdatePlayerResponseResult> {
  if (!isUuid(responseId) || !isUuid(optionId)) {
    return { ok: false, error: "Invalid response or option identifier.", status: 400 };
  }

  const supabase = createAdminClient();
  const { data: response, error: lookupError } = await supabase
    .from("poll_response")
    .select("id, poll_id, option_id, user_id")
    .eq("id", responseId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: lookupError.message, status: 500 };
  }

  if (!response || response.user_id !== playerId) {
    return { ok: false, error: "Response not found.", status: 404 };
  }

  if (response.option_id === optionId) {
    const { data: currentOption } = await supabase
      .from("poll_options")
      .select("label")
      .eq("id", optionId)
      .maybeSingle();

    return {
      ok: true,
      optionId,
      answer: currentOption?.label?.trim() || "Unknown answer"
    };
  }

  const validation = await validatePollOptionBelongsToPoll(response.poll_id, optionId);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  const { data: option, error: optionError } = await supabase
    .from("poll_options")
    .select("label")
    .eq("id", optionId)
    .maybeSingle();

  if (optionError) {
    return { ok: false, error: optionError.message, status: 500 };
  }

  const { error: updateError } = await supabase
    .from("poll_response")
    .update({ option_id: optionId })
    .eq("id", responseId)
    .eq("user_id", playerId);

  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }

  return {
    ok: true,
    optionId,
    answer: option?.label?.trim() || "Unknown answer"
  };
}
