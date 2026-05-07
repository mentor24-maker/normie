import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createPublicClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
