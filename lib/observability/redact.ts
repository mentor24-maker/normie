const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_PATTERN = /bearer\s+[a-z0-9._-]+/gi;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const SUPABASE_KEY_PATTERN = /(sb_|sbp_)[a-zA-Z0-9_-]{20,}/g;

function redactString(value: string) {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(JWT_PATTERN, "[redacted-jwt]")
    .replace(SUPABASE_KEY_PATTERN, "[redacted-key]");
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, depth + 1));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (/password|token|secret|authorization|cookie|session|email|phone/i.test(key)) {
        output[key] = "[redacted]";
        continue;
      }

      output[key] = redactValue(entry, depth + 1);
    }

    return output;
  }

  return value;
}
