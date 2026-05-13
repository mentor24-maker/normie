import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logoWide from "@/images/logo_normie_3_1600x500.png";
import { SiteNav } from "@/src/site/layout/site-nav";

export function SiteShell({
  children,
  className = "page-shell",
  showNav = true
}: {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
}) {
  return (
    <main className={className}>
      <div className="site-shell">
        {showNav ? (
          <div className="site-shell-nav-group">
            <div className="site-shell-topbar">
              <Link className="site-shell-logo-link" href="/">
                <Image
                  alt="Normie logo"
                  className="site-shell-logo"
                  priority
                  src={logoWide}
                />
              </Link>
              <Link className="site-shell-login-link" href="/admin">
                Login
              </Link>
            </div>
            <SiteNav />
          </div>
        ) : null}
        {children}
        <footer className="site-shell-footer">
          <Link className="site-shell-footer-link" href="/privacy">privacy</Link>
          <Link className="site-shell-footer-link" href="/terms">terms</Link>
        </footer>
      </div>
    </main>  
  );
}
