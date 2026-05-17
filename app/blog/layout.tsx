import type { ReactNode } from "react";
import { BlogSiteHeader } from "@/src/site/blog/blog-site-header";
import { SiteShell } from "@/src/site/layout/site-shell";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <BlogSiteHeader />
      {children}
    </SiteShell>
  );
}
