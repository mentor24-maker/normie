import { beforeEach, describe, expect, it, vi } from "vitest";

const consumePublicRateLimit = vi.fn();
const sendPlayerSignupConfirmationEmail = vi.fn();
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

vi.mock("@/lib/player-signup-confirmation-email", () => ({
  sendPlayerSignupConfirmationEmail: (...args: unknown[]) =>
    sendPlayerSignupConfirmationEmail(...args)
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers } }
  })
}));

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/player/resend-confirmation", {
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
  sendPlayerSignupConfirmationEmail.mockResolvedValue(undefined);
});

describe("POST /api/player/resend-confirmation", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });

    const response = await POST(buildRequest({ email: "a@b.com" }));

    expect(response.status).toBe(429);
    expect(sendPlayerSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  it("requires an email", async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
  });

  it("resends confirmation for an unconfirmed account", async () => {
    listUsers.mockResolvedValue({
      data: {
        users: [
          {
            email: "player@example.com",
            email_confirmed_at: null,
            user_metadata: { full_name: "Player One", handle: "player1" }
          }
        ]
      },
      error: null
    });

    const response = await POST(buildRequest({ email: "player@example.com" }));

    expect(response.status).toBe(200);
    expect(sendPlayerSignupConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "player@example.com" })
    );
  });

  it("stays blind for unknown or already-confirmed accounts", async () => {
    const unknown = await (await POST(buildRequest({ email: "nobody@example.com" }))).json();

    listUsers.mockResolvedValue({
      data: {
        users: [{ email: "done@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" }]
      },
      error: null
    });
    const confirmed = await (await POST(buildRequest({ email: "done@example.com" }))).json();

    expect(confirmed).toEqual(unknown);
    expect(sendPlayerSignupConfirmationEmail).not.toHaveBeenCalled();
  });
});
