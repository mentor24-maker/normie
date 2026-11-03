"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  isPlayerPortalPlayPollsOpen,
  PLAYER_PORTAL_PLAY_POLLS_HREF,
  scrollPlayerPortalPollsIntoView
} from "@/lib/player-portal-play-polls";

export function PlayerPortalPlayCta() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pollsAreOpen = isPlayerPortalPlayPollsOpen(pathname, searchParams);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/portal/dashboard") {
      return;
    }

    event.preventDefault();

    if (pollsAreOpen) {
      scrollPlayerPortalPollsIntoView();
      return;
    }

    router.push(PLAYER_PORTAL_PLAY_POLLS_HREF, { scroll: false });
  }

  return (
    <Link
      className="submit-button player-portal-play-cta"
      href={PLAYER_PORTAL_PLAY_POLLS_HREF}
      onClick={handleClick}
    >
      Would You Rather...?
    </Link>
  );
}
