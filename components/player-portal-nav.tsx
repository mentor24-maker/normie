"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  isPlayerPortalPlayPollsOpen,
  PLAYER_PORTAL_PLAY_POLLS_HREF
} from "@/components/player-portal-poll-section";
import { PlayerLogoutButton } from "@/components/player-logout-button";

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/polls", label: "My Polls" },
  { href: "/portal/points", label: "Points" },
  { href: "/portal/leaderboard", label: "Leaderboard" },
  { href: "/portal/profile", label: "Profile" }
] as const;

function isNavActive(pathname: string, href: string, playPollsOpen: boolean): boolean {
  if (href === "/portal/dashboard" && playPollsOpen) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlayerPortalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const playPollsActive = isPlayerPortalPlayPollsOpen(pathname, searchParams);

  return (
    <nav className="player-portal-nav" aria-label="Player navigation">
      <div className="player-portal-nav-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`player-portal-nav-link${
              isNavActive(pathname, item.href, playPollsActive) ? " is-active" : ""
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className={`player-portal-nav-link player-portal-nav-link-play${
            playPollsActive ? " is-active" : ""
          }`}
          href={PLAYER_PORTAL_PLAY_POLLS_HREF}
        >
          Play Polls
        </Link>
      </div>
      <PlayerLogoutButton />
    </nav>
  );
}
