import { beforeEach, describe, expect, it, vi } from "vitest";

const consumePublicRateLimit = vi.fn();
const validatePollAnswerSubmission = vi.fn();
const getAuthorizedPlayerFromCookieStore = vi.fn();
const cookieValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieValues.get(name);
      return value === undefined ? undefined : { name, value };
    }
  })
}));

vi.mock("@/lib/public-rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/public-rate-limit")>();
  return {
    ...actual,
    consumePublicRateLimit: (...args: unknown[]) => consumePublicRateLimit(...args)
  };
});

vi.mock("@/lib/player-auth", () => ({
  getAuthorizedPlayerFromCookieStore: (...args: unknown[]) =>
    getAuthorizedPlayerFromCookieStore(...args)
}));

vi.mock("@/lib/poll-answer-validation", () => ({
  validatePollAnswerSubmission: (...args: unknown[]) => validatePollAnswerSubmission(...args)
}));

vi.mock("@/lib/player-tester-poll", () => ({
  buildTesterPollAnswerSimulation: vi.fn(),
  loadPlayerTesterPollPin: vi.fn(async () => null),
  validateTesterPollAnswer: vi.fn()
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => {
    throw new Error("guard tests must not reach the database");
  }
}));

import { POST } from "./route";
import { POLL_SESSION_COOKIE } from "@/lib/poll-session-cookie";

const SESSION_ID = "3f2f4c1e-9a1b-4a6e-8f0d-2b7c5d9e1a23";

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/polls/answer", {
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
  cookieValues.clear();
  cookieValues.set(POLL_SESSION_COOKIE, SESSION_ID);
  consumePublicRateLimit.mockResolvedValue({ allowed: true });
  getAuthorizedPlayerFromCookieStore.mockResolvedValue(null);
  validatePollAnswerSubmission.mockResolvedValue({ ok: false, error: "Poll not found.", status: 404 });
});

describe("POST /api/polls/answer (guard layer)", () => {
  it("rejects requests without a valid poll session cookie", async () => {
    cookieValues.delete(POLL_SESSION_COOKIE);

    const response = await POST(buildRequest({ pollId: "p1", optionId: "o1" }));

    expect(response.status).toBe(400);
  });

  it("rejects malformed session ids", async () => {
    cookieValues.set(POLL_SESSION_COOKIE, "not-a-uuid");

    const response = await POST(buildRequest({ pollId: "p1", optionId: "o1" }));

    expect(response.status).toBe(400);
  });

  it("enforces both session and IP rate limit buckets", async () => {
    await POST(buildRequest({ pollId: "p1", optionId: "o1" }));

    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      `poll-answer:session:${SESSION_ID}`,
      expect.any(Number),
      expect.any(Number)
    );
    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      "poll-answer:ip:203.0.113.7",
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("returns 429 when a rate limit bucket is exhausted", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 20 });

    const response = await POST(buildRequest({ pollId: "p1", optionId: "o1" }));

    expect(response.status).toBe(429);
    expect(validatePollAnswerSubmission).not.toHaveBeenCalled();
  });

  it("requires pollId and optionId", async () => {
    expect((await POST(buildRequest({ optionId: "o1" }))).status).toBe(400);
    expect((await POST(buildRequest({ pollId: "p1" }))).status).toBe(400);
  });

  it("passes validation failures through with their status", async () => {
    validatePollAnswerSubmission.mockResolvedValue({
      ok: false,
      error: "That poll is not published.",
      status: 409
    });

    const response = await POST(buildRequest({ pollId: "p1", optionId: "o1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("That poll is not published.");
  });
});
