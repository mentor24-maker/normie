import { beforeEach, describe, expect, it, vi } from "vitest";

const consumePublicRateLimit = vi.fn();
const sendPlayerPasswordResetEmail = vi.fn();
const listUsers = vi.fn();

vi.mock("@/lib/public-rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/public-rate-limit")>();
  return {
    ...actual,
    consumePublicRateLimit: (...args: unknown[]) => consumePublicRateLimit(...args)
  };
});

vi.mock("@/lib/send-builder-auth-email", () => ({
  isAuthEmailDeliveryConfigured: () => true
}));

vi.mock("@/lib/player-password-reset-email", () => ({
  sendPlayerPasswordResetEmail: (...args: unknown[]) => sendPlayerPasswordResetEmail(...args)
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers } }
  })
}));

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/player/password-reset", {
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
  listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  sendPlayerPasswordResetEmail.mockResolvedValue(undefined);
});

describe("POST /api/player/password-reset", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(429);
    expect(sendPlayerPasswordResetEmail).not.toHaveBeenCalled();
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("uses a per-IP rate limit bucket", async () => {
    await POST(buildRequest({ email: "a@b.com" }));

    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      "player-password-reset:ip:203.0.113.7",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("requires an email", async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
  });

  it("sends a reset email when the account exists", async () => {
    listUsers.mockResolvedValue({
      data: { users: [{ email: "player@example.com" }] },
      error: null
    });

    const response = await POST(buildRequest({ email: "Player@Example.com" }));

    expect(response.status).toBe(200);
    expect(sendPlayerPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "player@example.com" })
    );
  });

  it("returns an identical blind response whether or not the account exists", async () => {
    listUsers.mockResolvedValue({
      data: { users: [{ email: "player@example.com" }] },
      error: null
    });
    const existing = await (await POST(buildRequest({ email: "player@example.com" }))).json();

    listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    const missing = await (await POST(buildRequest({ email: "nobody@example.com" }))).json();

    expect(missing).toEqual(existing);
    expect(sendPlayerPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});
