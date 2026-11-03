import { createPublicClient } from "@/lib/supabase-public";

export type HealthCheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const startedAt = Date.now();

  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("polls").select("id").limit(1).maybeSingle();

    if (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error.message
      };
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Supabase health check failed."
    };
  }
}
