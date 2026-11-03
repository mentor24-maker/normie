import { BuilderTemplatePreviewClient } from "@/components/builder-template-preview-client";
import { createDefaultBackgroundSettings } from "@/lib/builder-template";
import { getBlogHeaderLayoutSections } from "@/lib/builder-site-modules";
import { BlogSiteHeader } from "@/src/site/blog/blog-site-header";

export async function BlogHeader() {
  const layoutSections = await getBlogHeaderLayoutSections();

  if (!layoutSections) {
    return <BlogSiteHeader />;
  }

  return (
    <div className="blog-builder-header">
      <BuilderTemplatePreviewClient
        layoutSections={layoutSections}
        pageBackground={createDefaultBackgroundSettings()}
        showShell={false}
      />
    </div>
  );
}
