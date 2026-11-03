import { PUBLIC_ERROR_MESSAGE } from "@/lib/observability/constants";
import { reportError } from "@/lib/observability/report-error";
import { getRequestId } from "@/lib/observability/request-id";
import { NextResponse } from "next/server";

type RouteHandler = (request: Request, context?: unknown) => Promise<Response>;

export function withObservedRoute(route: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const requestId = getRequestId(request);
    const startedAt = Date.now();

    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      reportError(`api.${route}.unhandled`, error, {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        durationMs: Date.now() - startedAt
      });

      const response = NextResponse.json(
        { error: PUBLIC_ERROR_MESSAGE, requestId },
        { status: 500 }
      );
      response.headers.set("x-request-id", requestId);
      return response;
    }
  };
}
