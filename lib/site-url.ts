const DEFAULT_SITE_URL = "https://www.normie.one";

const ALLOWED_SITE_HOSTS = new Set([
  "normie.one",
  "www.normie.one",
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3001"
]);

function normalizeSiteOrigin(value: string) {
  const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  return normalizeSiteOrigin(raw);
}

function resolveOriginFromRequest(request?: Request | null) {
  if (!request) {
    return null;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host || !ALLOWED_SITE_HOSTS.has(host)) {
    return null;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  return normalizeSiteOrigin(`${protocol}://${host}`);
}

/** Canonical admin OAuth / invite redirect (must be allowlisted in Supabase Auth). */
export function getAdminAuthCallbackUrl(request?: Request) {
  return `${resolveOriginFromRequest(request) ?? getSiteUrl()}/admin/auth/callback`;
}

export function getAdminInviteSetupUrl(request?: Request) {
  return `${resolveOriginFromRequest(request) ?? getSiteUrl()}/admin?invite=1`;
}

/** Canonical player password reset redirect (must be allowlisted in Supabase Auth). */
export function getPlayerPasswordResetUrl(request?: Request) {
  return `${resolveOriginFromRequest(request) ?? getSiteUrl()}/portal/reset`;
}

export function toAbsoluteSiteUrl(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, getSiteUrl()).toString();
  }
}
