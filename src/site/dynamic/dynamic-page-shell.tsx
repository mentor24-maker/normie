import { Suspense } from "react";
import { BuilderTemplatePreviewClient } from "@/components/builder-template-preview-client";
import { PublicPageLoading } from "@/components/public-page-loading";
import type { BuilderPageRecord } from "@/lib/builder-template";
import { SiteShell } from "@/src/site/layout/site-shell";

export function DynamicPageShell({ page }: { page: BuilderPageRecord }) {
  return (
    <SiteShell>
      <Suspense fallback={<PublicPageLoading />}>
        <BuilderTemplatePreviewClient
          layoutSections={page.layoutSections}
          pageBackground={page.pageBackground}
          showShell
        />
      </Suspense>
    </SiteShell>
  );
}
