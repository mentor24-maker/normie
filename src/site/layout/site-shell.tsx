import type { ReactNode } from "react";
import { SiteNav } from "@/src/site/layout/site-nav";

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
        <SiteNav />
        {children}
      </div>
    </main>
  );
}
