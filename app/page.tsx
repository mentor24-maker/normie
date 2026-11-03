import { Suspense } from "react";
import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { HomePage as HomePageView } from "@/src/site/home";

export default async function HomePage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("home");

  return (
    <Suspense fallback={null}>
      {dynamicPage ? <DynamicPageShell page={dynamicPage} /> : <HomePageView />}
    </Suspense>
  );
}
