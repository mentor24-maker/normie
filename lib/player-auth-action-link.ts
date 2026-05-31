export function normalizeSupabaseActionLink(actionLink: string): string {
  const trimmed = String(actionLink ?? "").trim();

  if (!trimmed) {
    throw new Error("Supabase did not return an action link.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, supabaseUrl).toString();
}
