import Link from "next/link";
import type { ReactNode } from "react";

export function SiteShell({
  children,
  className = "page-shell"
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={className}>
      <div className="site-shell">
        {children}
        <footer className="site-shell-footer">
          <span className="site-shell-footer-copy">© 2026 Normie</span>
          <Link className="site-shell-footer-link" href="/blog">Blog</Link>
          <Link className="site-shell-footer-link" href="/privacy">Privacy Policy</Link>
          <Link className="site-shell-footer-link" href="/terms">Terms of Service</Link>
        </footer>
      </div>
    </main>
  );
}
