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
          <Link className="site-shell-footer-link" href="/privacy">privacy what the hell?</Link>
          <Link className="site-shell-footer-link" href="/terms">terms</Link>
        </footer>
      </div>
    </main>
  );
}
