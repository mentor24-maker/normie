import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

const requireAdminRoute = vi.fn();
const listUsers = vi.fn();
const loadLeaderboardAggregateMap = vi.fn();

vi.mock("@/lib/admin-route-auth", () => ({
  requireAdminRoute: (...args: unknown[]) => requireAdminRoute(...args)
}));

vi.mock("@/lib/player-leaderboard-stats", () => ({
  loadLeaderboardAggregateMap: (...args: unknown[]) => loadLeaderboardAggregateMap(...args)
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { listUsers } },
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [
            {
              id: "user-1",
              full_name: "Player One",
              handle: "player1",
              status: "active",
              is_tester: false,
              tester_poll_id: null,
              crypto_wallets: null,
              created_at: "2026-01-02T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z"
            },
            {
              id: "user-orphan",
              full_name: "No Auth Row",
              handle: "ghost",
              status: "active",
              is_tester: false,
              tester_poll_id: null,
              crypto_wallets: null,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z"
            }
          ],
          error: null
        })
      })
    })
  })
}));

import { GET } from "./route";

function buildAuthUser(id: string, email: string): User {
  return {
    id,
    email,
    created_at: "2026-01-02T00:00:00Z",
    user_metadata: {},
    app_metadata: {}
  } as unknown as User;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminRoute.mockResolvedValue({
    admin: { id: "admin-1" },
    resolved: {},
    finish: <T,>(response: T) => response
  });
  listUsers.mockResolvedValue({
    data: { users: [buildAuthUser("user-1", "player@example.com")] },
    error: null
  });
  loadLeaderboardAggregateMap.mockResolvedValue({
    groups: new Map([["user-1", { answersCount: 7, tokensEarned: 7 }]]),
    countablePollIds: new Set()
  });
});

describe("GET /api/admin/users", () => {
  it("requires the users:read permission", async () => {
    await GET();

    expect(requireAdminRoute).toHaveBeenCalledWith("users:read");
  });

  it("returns the guard response when the admin session is rejected", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireAdminRoute.mockResolvedValue({ response: denied });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("merges auth users with profiles and drops profiles without auth rows", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({
      id: "user-1",
      email: "player@example.com",
      pollsTaken: 7
    });
  });
});
