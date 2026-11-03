import type { ReactNode } from "react";
import { BlogHeader } from "@/src/site/blog/blog-header";
import { BlogMainMenu } from "@/src/site/blog/blog-main-menu";
import { SiteShell } from "@/src/site/layout/site-shell";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <BlogHeader />
      <BlogMainMenu />
      {children}
    </SiteShell>
  );
}
