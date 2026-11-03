"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/polls", label: "My Polls" },
  { href: "/portal/points", label: "Points" },
  { href: "/portal/token", label: "Token" },
  { href: "/portal/leaderboard", label: "Leaderboard" },
  { href: "/portal/preferences", label: "Preferences" }
] as const;

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlayerPortalNav() {
  const pathname = usePathname();

  return (
    <nav className="player-portal-nav" aria-label="Player navigation">
      <div className="player-portal-nav-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`player-portal-nav-link${
              isNavActive(pathname, item.href) ? " is-active" : ""
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
