import { Suspense } from "react";
import { BuilderTemplatePreviewClient } from "@/components/builder-template-preview-client";
import type { BuilderPageRecord } from "@/lib/builder-template";
import { SiteShell } from "@/src/site/layout/site-shell";

export function DynamicPageShell({ page }: { page: BuilderPageRecord }) {
  return (
    <SiteShell>
      <Suspense fallback={null}>
        <BuilderTemplatePreviewClient
          layoutSections={page.layoutSections}
          pageBackground={page.pageBackground}
          showShell
        />
      </Suspense>
    </SiteShell>
  );
}
