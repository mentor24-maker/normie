import { createAdminClient } from "@/lib/supabase-admin";

export async function incrementPlayerLoginCount(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data: profile, error: readError } = await supabase
    .from("player_profiles")
    .select("login_count")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    if (readError.message.includes("login_count")) {
      return 1;
    }

    throw new Error(readError.message);
  }

  const nextCount = Math.max(0, Number(profile?.login_count ?? 0)) + 1;
  const { error: updateError } = await supabase
    .from("player_profiles")
    .update({ login_count: nextCount })
    .eq("id", userId);

  if (updateError) {
    if (updateError.message.includes("login_count")) {
      return nextCount;
    }

    throw new Error(updateError.message);
  }

  return nextCount;
}
