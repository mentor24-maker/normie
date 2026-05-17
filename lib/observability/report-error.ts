import { PUBLIC_ERROR_MESSAGE } from "@/lib/observability/constants";
import { logError, logWarn } from "@/lib/observability/logger";
import { getRequestId } from "@/lib/observability/request-id";
import { NextResponse } from "next/server";

type ReportContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}

export function reportError(event: string, error: unknown, context?: ReportContext) {
  logError(event, {
    ...context,
    error: serializeError(error)
  });
}

export function reportWarning(event: string, context?: ReportContext) {
  logWarn(event, context);
}

export function publicErrorResponse(
  request: Request,
  options: {
    status?: number;
    message?: string;
    code?: string;
    logEvent: string;
    error?: unknown;
    context?: ReportContext;
  }
) {
  const requestId = getRequestId(request);
  const status = options.status ?? 500;

  if (options.error) {
    reportError(options.logEvent, options.error, {
      requestId,
      status,
      ...options.context
    });
  } else {
    reportWarning(options.logEvent, {
      requestId,
      status,
      ...options.context
    });
  }

  const body: Record<string, unknown> = {
    error: options.message ?? PUBLIC_ERROR_MESSAGE,
    requestId
  };

  if (options.code) {
    body.code = options.code;
  }

  const response = NextResponse.json(body, { status });
  response.headers.set("x-request-id", requestId);
  return response;
}
