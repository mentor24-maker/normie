import Link from "next/link";

const siteNavItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/white-paper", label: "White Paper" },
  { href: "/contact", label: "Contact" }
];

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {siteNavItems.map((item) => (
        <Link className="site-nav-link" href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
