import { BuilderTemplatePreview } from "@/components/builder-template-preview";
import type { BuilderPageRecord } from "@/lib/builder-template";
import { SiteShell } from "@/src/site/layout/site-shell";

export function DynamicPageShell({ page }: { page: BuilderPageRecord }) {
  const hasNavigationModule = page.layoutSections.some((section) =>
    section.modules.some((module) => module.type === "navigation")
  );

  return (
    <SiteShell showNav={!hasNavigationModule}>
      <BuilderTemplatePreview
        layoutSections={page.layoutSections}
        pageBackground={page.pageBackground}
        showShell={false}
      />
    </SiteShell>
  );
}
