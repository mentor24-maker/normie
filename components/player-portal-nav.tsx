"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isPlayerPortalPlayPollsOpen } from "@/components/player-portal-poll-section";

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/polls", label: "My Polls" },
  { href: "/portal/points", label: "Points" },
  { href: "/portal/leaderboard", label: "Leaderboard" },
  { href: "/portal/preferences", label: "Preferences" }
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
      </div>
    </nav>
  );
}
