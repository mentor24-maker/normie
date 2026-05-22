import { BuilderTemplatePreviewClient } from "@/components/builder-template-preview-client";
import { createDefaultBackgroundSettings } from "@/lib/builder-template";
import { getBlogHeaderLayoutSections } from "@/lib/builder-site-modules";
import { BlogMainMenu } from "@/src/site/blog/blog-main-menu";
import { BlogSiteHeader } from "@/src/site/blog/blog-site-header";

async function SiteStandardHeader() {
  const layoutSections = await getBlogHeaderLayoutSections();

  if (!layoutSections) {
    return <BlogSiteHeader showBlogLabel={false} />;
  }

  return (
    <div className="blog-builder-header site-standard-builder-header">
      <BuilderTemplatePreviewClient
        layoutSections={layoutSections}
        pageBackground={createDefaultBackgroundSettings()}
        showShell={false}
      />
    </div>
  );
}

/**
 * Standard site chrome for routes outside the Page Builder (logo bar + main menu).
 * Same saved header/menu as blog; header omits the Blog label beside the logo.
 */
export async function SiteStandardChrome() {
  return (
    <>
      <SiteStandardHeader />
      <BlogMainMenu />
    </>
  );
}
