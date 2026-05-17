import { REQUEST_ID_HEADER } from "@/lib/observability/constants";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}`;
}

export function normalizeRequestId(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !REQUEST_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function getRequestId(request: Request) {
  return normalizeRequestId(request.headers.get(REQUEST_ID_HEADER)) ?? createRequestId();
}

export function applyRequestIdHeader(headers: Headers, requestId: string) {
  headers.set(REQUEST_ID_HEADER, requestId);
}
