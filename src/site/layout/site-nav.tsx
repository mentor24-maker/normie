import Link from "next/link";

export type SiteNavItem = {
  href: string;
  label: string;
};

export const defaultSiteNavItems: SiteNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/white-paper", label: "White Paper" },
  { href: "/contact", label: "Contact" }
];

export function SiteNav({ items = defaultSiteNavItems }: { items?: SiteNavItem[] }) {
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {items.map((item) => (
        <Link className="site-nav-link" href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
