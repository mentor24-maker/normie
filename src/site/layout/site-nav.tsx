"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SiteNavItem = {
  href: string;
  label: string;
};

export const defaultSiteNavItems: SiteNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/white-paper", label: "White Paper" },
  { href: "/portal", label: "Player Portal" },
  { href: "/contact", label: "Contact" }
];

function normalizeNavPath(value: string) {
  const path = value.split("?")[0]?.split("#")[0] || "/";
  const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;

  return normalized === "/home" ? "/" : normalized;
}

function isBlogPath(path: string) {
  return path === "/blog" || path.startsWith("/blog/");
}

function isNavItemActive(itemHref: string, activePath: string) {
  const normalizedHref = normalizeNavPath(itemHref);

  if (normalizedHref === "/blog") {
    return isBlogPath(activePath);
  }

  return normalizedHref === activePath;
}

export function SiteNav({ items = defaultSiteNavItems }: { items?: SiteNavItem[] }) {
  const pathname = usePathname();
  const activePath = normalizeNavPath(pathname || "/");

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, activePath);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`site-nav-link${isActive ? " site-nav-link-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
