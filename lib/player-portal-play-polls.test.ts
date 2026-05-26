import { describe, expect, it } from "vitest";
import { isPlayerPortalPlayPollsOpen, PLAYER_PORTAL_PLAY_POLLS_PARAM } from "@/lib/player-portal-play-polls";

function params(values: Record<string, string>) {
  return {
    get: (key: string) => values[key] ?? null
  };
}

describe("isPlayerPortalPlayPollsOpen", () => {
  it("opens only when playPolls=1 on the dashboard", () => {
    expect(
      isPlayerPortalPlayPollsOpen("/portal/dashboard", params({ [PLAYER_PORTAL_PLAY_POLLS_PARAM]: "1" }))
    ).toBe(true);
  });

  it("stays closed when playPolls is missing, zero, or on other routes", () => {
    expect(isPlayerPortalPlayPollsOpen("/portal/dashboard", params({}))).toBe(false);
    expect(
      isPlayerPortalPlayPollsOpen("/portal/dashboard", params({ [PLAYER_PORTAL_PLAY_POLLS_PARAM]: "0" }))
    ).toBe(false);
    expect(
      isPlayerPortalPlayPollsOpen("/portal/points", params({ [PLAYER_PORTAL_PLAY_POLLS_PARAM]: "1" }))
    ).toBe(false);
  });
});
