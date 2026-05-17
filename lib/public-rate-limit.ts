import { createAdminClient } from "@/lib/supabase-admin";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type RateLimitRow = {
  hits: number;
  expires_at: string;
};

function getRetryAfterSeconds(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export async function consumePublicRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const normalizedBucket = bucket.trim().slice(0, 200);

  if (!normalizedBucket || limit < 1 || windowSeconds < 1) {
    return { allowed: true };
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const nextExpiry = new Date(now + windowSeconds * 1000).toISOString();

  const { data: existing, error: readError } = await supabase
    .from("api_rate_limits")
    .select("hits, expires_at")
    .eq("bucket", normalizedBucket)
    .maybeSingle();

  if (readError) {
    if (readError.message.includes("api_rate_limits")) {
      return { allowed: true };
    }

    return { allowed: true };
  }

  const row = existing as RateLimitRow | null;
  const isExpired = !row || new Date(row.expires_at).getTime() <= now;

  if (isExpired) {
    const { error: upsertError } = await supabase.from("api_rate_limits").upsert({
      bucket: normalizedBucket,
      hits: 1,
      expires_at: nextExpiry
    });

    if (upsertError) {
      return { allowed: true };
    }

    return { allowed: true };
  }

  if (row.hits >= limit) {
    return { allowed: false, retryAfterSeconds: getRetryAfterSeconds(row.expires_at) };
  }

  const { error: updateError } = await supabase
    .from("api_rate_limits")
    .update({
      hits: row.hits + 1,
      expires_at: row.expires_at
    })
    .eq("bucket", normalizedBucket);

  if (updateError) {
    return { allowed: true };
  }

  return { allowed: true };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please wait a moment and try again.",
      code: "RATE_LIMITED",
      retryAfterSeconds
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}
