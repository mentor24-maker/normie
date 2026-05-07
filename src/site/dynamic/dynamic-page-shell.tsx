import { BuilderTemplatePreview } from "@/components/builder-template-preview";
import type { BuilderPageRecord } from "@/lib/builder-template";
import { SiteShell } from "@/src/site/layout/site-shell";

export function DynamicPageShell({ page }: { page: BuilderPageRecord }) {
  return (
    <SiteShell>
      <BuilderTemplatePreview
        layoutSections={page.layoutSections}
        pageBackground={page.pageBackground}
        showShell={false}
      />
    </SiteShell>
  );
}
