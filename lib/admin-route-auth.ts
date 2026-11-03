import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthorizedAdmin } from "@/lib/admin-auth";
import {
  applyAdminSessionCookies,
  clearAdminCookieOptions,
  ADMIN_ACCESS_COOKIE,
  ADMIN_PROFILE_COOKIE,
  ADMIN_REFRESH_COOKIE,
  resolveAuthorizedAdminFromCookieStore,
  type ResolvedAdminSession
} from "@/lib/admin-auth";
import { adminHasPermission, ADMIN_FORBIDDEN_CODE, getAdminRole, type AdminPermission } from "@/lib/admin-rbac";
import { ADMIN_SESSION_EXPIRED_CODE } from "@/lib/admin-session-client";

export { ADMIN_FORBIDDEN_CODE, ADMIN_SESSION_EXPIRED_CODE };
export type { AdminPermission };

export function unauthorizedAdminResponse(message = "Your admin session has expired. Please sign in again.") {
  const response = NextResponse.json(
    { error: message, code: ADMIN_SESSION_EXPIRED_CODE },
    { status: 401 }
  );
  const options = clearAdminCookieOptions();
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
  response.cookies.set(ADMIN_PROFILE_COOKIE, "", options);
  return response;
}

export function finishAdminRouteResponse<T extends NextResponse>(
  response: T,
  resolved: ResolvedAdminSession
): T {
  if (resolved.refreshed) {
    applyAdminSessionCookies(
      response,
      resolved.refreshed.accessToken,
      resolved.refreshed.refreshToken,
      resolved.refreshed.snapshot
    );
  }

  return response;
}

export type AdminRouteAuth =
  | {
      admin: AuthorizedAdmin;
      resolved: ResolvedAdminSession;
      finish: <T extends NextResponse>(response: T) => T;
    }
  | {
      response: NextResponse;
    };

export function forbiddenAdminResponse(message = "You do not have permission to perform this action.") {
  return NextResponse.json({ error: message, code: ADMIN_FORBIDDEN_CODE }, { status: 403 });
}

export async function requireAdminRoute(requiredPermission?: AdminPermission): Promise<AdminRouteAuth> {
  const cookieStore = await cookies();
  const resolved = await resolveAuthorizedAdminFromCookieStore(cookieStore);

  if (!resolved) {
    return { response: unauthorizedAdminResponse() };
  }

  if (requiredPermission && !adminHasPermission(getAdminRole(resolved.admin), requiredPermission)) {
    return { response: forbiddenAdminResponse() };
  }

  return {
    admin: resolved.admin,
    resolved,
    finish: <T extends NextResponse>(response: T) => finishAdminRouteResponse(response, resolved)
  };
}
