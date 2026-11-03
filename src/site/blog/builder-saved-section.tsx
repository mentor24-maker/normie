import { BuilderTemplatePreviewClient } from "@/components/builder-template-preview-client";
import { createDefaultBackgroundSettings } from "@/lib/builder-template";
import { getSavedSectionLayoutSections } from "@/lib/builder-site-modules";

type BuilderSavedSectionProps = {
  sectionName: string;
  className: string;
};

export async function BuilderSavedSection({ sectionName, className }: BuilderSavedSectionProps) {
  const layoutSections = await getSavedSectionLayoutSections(sectionName);

  if (!layoutSections) {
    return null;
  }

  return (
    <div className={className}>
      <BuilderTemplatePreviewClient
        layoutSections={layoutSections}
        pageBackground={createDefaultBackgroundSettings()}
        showShell={false}
      />
    </div>
  );
}
