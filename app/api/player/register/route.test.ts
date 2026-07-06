import { beforeEach, describe, expect, it, vi } from "vitest";

const consumePublicRateLimit = vi.fn();
const sendPlayerSignupConfirmationEmail = vi.fn();
const listUsers = vi.fn();
const generateLink = vi.fn();
const upsertResult = vi.fn();
const profileSingle = vi.fn();

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

vi.mock("@/lib/player-signup-confirmation-email", () => ({
  sendPlayerSignupConfirmationEmail: (...args: unknown[]) =>
    sendPlayerSignupConfirmationEmail(...args)
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers, generateLink } },
    from: () => ({
      // The route both awaits upsert() directly (existing-user path) and
      // chains .select().single() off it (new-user path), mirroring the
      // thenable supabase-js query builder.
      upsert: () => ({
        select: () => ({ single: profileSingle }),
        then: (resolve: (value: unknown) => void) => resolve(upsertResult())
      })
    })
  })
}));

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/player/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.7"
    },
    body: JSON.stringify(body)
  });
}

const validBody = {
  email: "new@example.com",
  password: "hunter22",
  fullName: "New Player",
  handle: "newplayer"
};

beforeEach(() => {
  vi.clearAllMocks();
  consumePublicRateLimit.mockResolvedValue({ allowed: true });
  listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  generateLink.mockResolvedValue({
    data: {
      user: { id: "user-1", email: "new@example.com", email_confirmed_at: null },
      properties: { action_link: "https://example.com/confirm" }
    },
    error: null
  });
  upsertResult.mockReturnValue({ error: null });
  profileSingle.mockResolvedValue({
    data: {
      id: "user-1",
      full_name: "New Player",
      handle: "newplayer",
      status: "active",
      created_at: null,
      updated_at: null
    },
    error: null
  });
  sendPlayerSignupConfirmationEmail.mockResolvedValue(undefined);
});

describe("POST /api/player/register", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 300 });

    const response = await POST(buildRequest(validBody));

    expect(response.status).toBe(429);
    expect(generateLink).not.toHaveBeenCalled();
    expect(sendPlayerSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  it("uses a per-IP rate limit bucket", async () => {
    await POST(buildRequest(validBody));

    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      "player-register:ip:203.0.113.7",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("requires email and password", async () => {
    expect((await POST(buildRequest({ password: "hunter22" }))).status).toBe(400);
    expect((await POST(buildRequest({ email: "a@b.com" }))).status).toBe(400);
  });

  it("rejects short passwords", async () => {
    const response = await POST(buildRequest({ ...validBody, password: "abc" }));

    expect(response.status).toBe(400);
  });

  it("registers a new player and sends a confirmation email", async () => {
    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.needsEmailConfirmation).toBe(true);
    expect(body.user).toMatchObject({ id: "user-1", email: "new@example.com" });
    expect(sendPlayerSignupConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com" })
    );
  });

  it("returns 409 for an already-confirmed existing account without sending email", async () => {
    listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-9",
            email: "new@example.com",
            email_confirmed_at: "2026-01-01T00:00:00Z",
            user_metadata: {}
          }
        ]
      },
      error: null
    });

    const response = await POST(buildRequest(validBody));

    expect(response.status).toBe(409);
    expect(sendPlayerSignupConfirmationEmail).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("resends confirmation for an existing unconfirmed account", async () => {
    listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-9",
            email: "new@example.com",
            email_confirmed_at: null,
            user_metadata: {}
          }
        ]
      },
      error: null
    });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.needsEmailConfirmation).toBe(true);
    expect(sendPlayerSignupConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
