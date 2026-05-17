import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_PROFILE_COOKIE,
  ADMIN_REFRESH_COOKIE,
  applyAdminSessionCookies,
  clearAdminCookieOptions,
  resolveAuthorizedAdminFromCookieStore,
  type ResolvedAdminSession
} from "@/lib/admin-auth";
import { ADMIN_SESSION_EXPIRED_CODE } from "@/lib/admin-session-client";

export function getRequestCookieStore(request: NextRequest) {
  return {
    get: (name: string) => request.cookies.get(name)
  };
}

export function isAdminSessionPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin/") ||
    pathname === "/api/import"
  );
}

export function isPublicAdminPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/auth/");
}

export function isProtectedAdminPage(pathname: string) {
  return pathname.startsWith("/admin/") && !isPublicAdminPage(pathname);
}

export function isPublicAdminApiRoute(pathname: string, method: string) {
  if (method === "POST") {
    return (
      pathname === "/api/admin/session" ||
      pathname === "/api/admin/register" ||
      pathname === "/api/admin/session/oauth"
    );
  }

  if (method === "DELETE" && pathname === "/api/admin/session") {
    return true;
  }

  return false;
}

export function isProtectedAdminApiRoute(pathname: string, method: string) {
  if (!pathname.startsWith("/api/admin/") && pathname !== "/api/import") {
    return false;
  }

  return !isPublicAdminApiRoute(pathname, method);
}

export function requiresAdminSession(pathname: string, method: string) {
  return isProtectedAdminPage(pathname) || isProtectedAdminApiRoute(pathname, method);
}

export async function resolveAdminSessionForRequest(request: NextRequest) {
  return resolveAuthorizedAdminFromCookieStore(getRequestCookieStore(request));
}

export function applyRefreshedSessionToResponse(
  response: NextResponse,
  resolved: ResolvedAdminSession | null
) {
  if (!resolved?.refreshed) {
    return response;
  }

  applyAdminSessionCookies(
    response,
    resolved.refreshed.accessToken,
    resolved.refreshed.refreshToken,
    resolved.refreshed.snapshot
  );

  return response;
}

export function unauthorizedAdminApiResponse() {
  const response = NextResponse.json(
    { error: "Unauthorized admin request.", code: ADMIN_SESSION_EXPIRED_CODE },
    { status: 401 }
  );
  const options = clearAdminCookieOptions();
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
  response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);
  return response;
}

export function redirectToAdminLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin";
  loginUrl.search = "expired=1";
  return NextResponse.redirect(loginUrl);
}
