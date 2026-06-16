import type { createAdminClient } from "@/lib/supabase-admin";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export type AdminPollDeleteResult = {
  deletedPollCount: number;
  deletedResponseCount: number;
  deletedReactionCount: number;
};

export async function deleteAdminPolls(
  supabase: AdminSupabaseClient,
  pollIds: string[],
  options: { deletePlayerRecords: boolean }
): Promise<AdminPollDeleteResult> {
  let deletedResponseCount = 0;
  let deletedReactionCount = 0;

  if (options.deletePlayerRecords) {
    const { count: responseCount, error: responseCountError } = await supabase
      .from("poll_response")
      .select("id", { count: "exact", head: true })
      .in("poll_id", pollIds);

    if (responseCountError) {
      throw responseCountError;
    }

    const { count: reactionCount, error: reactionCountError } = await supabase
      .from("poll_reaction")
      .select("id", { count: "exact", head: true })
      .in("poll_id", pollIds);

    if (reactionCountError && !reactionCountError.message.includes("poll_reaction")) {
      throw reactionCountError;
    }

    const { error: reactionDeleteError } = await supabase.from("poll_reaction").delete().in("poll_id", pollIds);

    if (reactionDeleteError && !reactionDeleteError.message.includes("poll_reaction")) {
      throw reactionDeleteError;
    }

    const { error: responseDeleteError } = await supabase.from("poll_response").delete().in("poll_id", pollIds);

    if (responseDeleteError) {
      throw responseDeleteError;
    }

    deletedResponseCount = responseCount ?? 0;
    deletedReactionCount = reactionCount ?? 0;
  } else {
    const { count: responseCount, error: responseCountError } = await supabase
      .from("poll_response")
      .select("id", { count: "exact", head: true })
      .in("poll_id", pollIds);

    if (responseCountError) {
      throw responseCountError;
    }

    if ((responseCount ?? 0) > 0) {
      throw new Error(
        "These polls still have player answers. Check “Delete Player Answers and Reactions” or hide the polls instead."
      );
    }

    const { count: reactionCount, error: reactionCountError } = await supabase
      .from("poll_reaction")
      .select("id", { count: "exact", head: true })
      .in("poll_id", pollIds);

    if (reactionCountError && !reactionCountError.message.includes("poll_reaction")) {
      throw reactionCountError;
    }

    if ((reactionCount ?? 0) > 0) {
      throw new Error(
        "These polls still have player reactions. Check “Delete Player Answers and Reactions” or hide the polls instead."
      );
    }
  }

  const { error: pollDeleteError } = await supabase.from("polls").delete().in("id", pollIds);

  if (pollDeleteError) {
    throw pollDeleteError;
  }

  return {
    deletedPollCount: pollIds.length,
    deletedResponseCount,
    deletedReactionCount
  };
}
