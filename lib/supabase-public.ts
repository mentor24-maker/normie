import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "./env";

export function createPublicClient() {
  const { url, anonKey } = getPublicSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
