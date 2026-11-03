import { describe, expect, it } from "vitest";
import {
  buildLeaderboardGroups,
  getLeaderboardStatsForPlayer,
  sortLeaderboardGroups,
  type RegisteredPollResponseRow
} from "@/lib/player-leaderboard-stats";

const countablePollIds = new Set(["poll-a", "poll-b", "poll-c"]);

function response(
  userId: string,
  pollId: string,
  tokens: number,
  createdAt: string,
  isSkipped = false
): RegisteredPollResponseRow {
  return {
    user_id: userId,
    poll_id: pollId,
    tokens_earned: tokens,
    is_skipped: isSkipped,
    created_at: createdAt
  };
}

describe("player-leaderboard-stats", () => {
  it("aggregates polls and points per player and merges reaction points", () => {
    const groups = buildLeaderboardGroups(
      [
        response("user-1", "poll-a", 2, "2026-01-02T00:00:00.000Z"),
        response("user-1", "poll-b", 1, "2026-01-01T00:00:00.000Z", true),
        response("user-2", "poll-a", 3, "2026-01-03T00:00:00.000Z"),
        response("user-1", "poll-deleted", 99, "2026-01-04T00:00:00.000Z")
      ],
      countablePollIds,
      new Map([["user-1", 4]])
    );

    expect(groups.get("user-1")).toEqual({
      playerId: "user-1",
      answersCount: 1,
      tokensEarned: 7,
      firstAnsweredAt: "2026-01-01T00:00:00.000Z"
    });

    expect(groups.get("user-2")).toEqual({
      playerId: "user-2",
      answersCount: 1,
      tokensEarned: 3,
      firstAnsweredAt: "2026-01-03T00:00:00.000Z"
    });
  });

  it("sorts by points, then polls, then earliest answer", () => {
    const sorted = sortLeaderboardGroups([
      {
        playerId: "late-high",
        answersCount: 5,
        tokensEarned: 10,
        firstAnsweredAt: "2026-02-01T00:00:00.000Z"
      },
      {
        playerId: "early-high",
        answersCount: 5,
        tokensEarned: 10,
        firstAnsweredAt: "2026-01-01T00:00:00.000Z"
      },
      {
        playerId: "more-polls",
        answersCount: 6,
        tokensEarned: 10,
        firstAnsweredAt: "2026-01-15T00:00:00.000Z"
      },
      {
        playerId: "low",
        answersCount: 1,
        tokensEarned: 1,
        firstAnsweredAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(sorted.map((row) => row.playerId)).toEqual(["more-polls", "early-high", "late-high", "low"]);
  });

  it("returns rank and totals for a player from the shared aggregate", () => {
    const groups = buildLeaderboardGroups(
      [
        response("user-1", "poll-a", 5, "2026-01-01T00:00:00.000Z"),
        response("user-2", "poll-a", 10, "2026-01-02T00:00:00.000Z"),
        response("user-3", "poll-a", 10, "2026-01-03T00:00:00.000Z")
      ],
      countablePollIds,
      new Map()
    );

    expect(getLeaderboardStatsForPlayer(groups, "user-1")).toEqual({
      pollsTaken: 1,
      tokensEarned: 5,
      playerRank: 3
    });

    expect(getLeaderboardStatsForPlayer(groups, "user-2")).toEqual({
      pollsTaken: 1,
      tokensEarned: 10,
      playerRank: 1
    });
  });
});
