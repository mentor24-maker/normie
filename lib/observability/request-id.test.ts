import { describe, expect, it } from "vitest";
import { createRequestId, getRequestId, normalizeRequestId } from "@/lib/observability/request-id";

describe("request id helpers", () => {
  it("creates uuid request ids", () => {
    expect(normalizeRequestId(createRequestId())).toBeTruthy();
  });

  it("rejects invalid request ids", () => {
    expect(normalizeRequestId("not-valid")).toBeNull();
  });

  it("reads request ids from incoming headers", () => {
    const requestId = createRequestId();
    const request = new Request("https://example.com", {
      headers: { "x-request-id": requestId }
    });

    expect(getRequestId(request)).toBe(requestId);
  });
});
