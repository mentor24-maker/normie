import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyRefreshedSessionToResponse,
  isAdminSessionPath,
  redirectToAdminLogin,
  requiresAdminSession,
  resolveAdminSessionForRequest,
  unauthorizedAdminApiResponse
} from "@/lib/admin-middleware";
import { applyRequestIdHeader, createRequestId, normalizeRequestId } from "@/lib/observability/request-id";
import { applySecurityHeaders } from "@/lib/security-headers";

function withRequestId(request: NextRequest, response: NextResponse) {
  const requestId = normalizeRequestId(request.headers.get("x-request-id")) ?? createRequestId();
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const requestId = normalizeRequestId(request.headers.get("x-request-id")) ?? createRequestId();
  const requestHeaders = new Headers(request.headers);
  applyRequestIdHeader(requestHeaders, requestId);
  try {
    const needsAdminSession = requiresAdminSession(pathname, method);
    const resolved =
      needsAdminSession || isAdminSessionPath(pathname)
        ? await resolveAdminSessionForRequest(request)
        : null;

    if (needsAdminSession && !resolved) {
      const denied =
        pathname.startsWith("/api/") || pathname === "/api/import"
          ? unauthorizedAdminApiResponse()
          : redirectToAdminLogin(request);

      return withRequestId(request, applySecurityHeaders(denied));
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
    applyRefreshedSessionToResponse(response, resolved);

    return withRequestId(request, applySecurityHeaders(response));
  } catch {
    const denied =
      pathname.startsWith("/api/") || pathname === "/api/import"
        ? unauthorizedAdminApiResponse()
        : redirectToAdminLogin(request);

    return withRequestId(request, applySecurityHeaders(denied));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
