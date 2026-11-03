export const PLAYER_PORTAL_PLAY_POLLS_PARAM = "playPolls";
export const PLAYER_PORTAL_POLLS_SECTION_ID = "player-portal-play-polls";

export const PLAYER_PORTAL_PLAY_POLLS_HREF = `/portal/dashboard?${PLAYER_PORTAL_PLAY_POLLS_PARAM}=1#${PLAYER_PORTAL_POLLS_SECTION_ID}`;

export function isPlayerPortalPlayPollsOpen(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return pathname === "/portal/dashboard" && searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) === "1";
}

export function scrollPlayerPortalPollsIntoView(): void {
  if (typeof window === "undefined") {
    return;
  }

  const target = document.getElementById(PLAYER_PORTAL_POLLS_SECTION_ID);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
