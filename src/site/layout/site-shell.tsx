import type { ReactNode } from "react";
import { SiteCopyrightFooter } from "@/src/site/layout/site-copyright-footer";

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
        <SiteCopyrightFooter />
      </div>
    </main>
  );
}
