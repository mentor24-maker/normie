import { beforeEach, describe, expect, it, vi } from "vitest";

const consumePublicRateLimit = vi.fn();
const getPlayerEmailConfirmationStatus = vi.fn();

vi.mock("@/lib/public-rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/public-rate-limit")>();
  return {
    ...actual,
    consumePublicRateLimit: (...args: unknown[]) => consumePublicRateLimit(...args)
  };
});

vi.mock("@/lib/player-email-confirmation", () => ({
  getPlayerEmailConfirmationStatus: (...args: unknown[]) =>
    getPlayerEmailConfirmationStatus(...args)
}));

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/player/confirmation-status", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.7"
    },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  consumePublicRateLimit.mockResolvedValue({ allowed: true });
  getPlayerEmailConfirmationStatus.mockResolvedValue("unknown");
});

describe("POST /api/player/confirmation-status", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 120 });

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(429);
    expect(getPlayerEmailConfirmationStatus).not.toHaveBeenCalled();
  });

  it("uses a per-IP rate limit bucket", async () => {
    await POST(buildRequest({ email: "a@b.com" }));

    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      "player-confirmation-status:ip:203.0.113.7",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("rejects missing or invalid emails", async () => {
    expect((await POST(buildRequest({}))).status).toBe(400);
    expect((await POST(buildRequest({ email: "not-an-email" }))).status).toBe(400);
  });

  it("returns the confirmation status for a valid email", async () => {
    getPlayerEmailConfirmationStatus.mockResolvedValue("waiting_for_verification");

    const response = await POST(buildRequest({ email: "Player@Example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "waiting_for_verification",
      awaitingVerification: true
    });
    expect(getPlayerEmailConfirmationStatus).toHaveBeenCalledWith("player@example.com");
  });
});
