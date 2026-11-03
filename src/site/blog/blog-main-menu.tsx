import { BLOG_MAIN_MENU_SAVED_SECTION_NAME } from "@/lib/builder-site-modules";
import { BuilderSavedSection } from "@/src/site/blog/builder-saved-section";

export async function BlogMainMenu() {
  return (
    <BuilderSavedSection
      className="blog-builder-main-menu"
      sectionName={BLOG_MAIN_MENU_SAVED_SECTION_NAME}
    />
  );
}
