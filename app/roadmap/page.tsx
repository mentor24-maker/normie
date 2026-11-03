import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { SiteContentPage } from "@/src/site/content/site-content-page";

export default async function RoadmapPage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("roadmap");

  if (dynamicPage) {
    return <DynamicPageShell page={dynamicPage} />;
  }

  return (
    <SiteContentPage
      eyebrow="Roadmap"
      title="From launch attention to a deeper data and community platform."
      intro={[
        "The roadmap starts with viral attention and a tight poll loop, then expands into community, insight products, and monetization layers.",
        "Each phase is designed to make the dataset richer, the identity layer stronger, and the overall platform harder to ignore."
      ]}
      chips={["Launch", "Viral growth", "Data layer"]}
      sections={[
        {
          label: "Phase 1",
          title: "Launch: Days 1 to 7",
          bullets: [
            "Launch on Pump.fun",
            "Deploy the X account",
            "Drop 10 to 20 viral poll posts daily",
            "Launch normie.one as the landing hub",
            "Create shareable image content"
          ]
        },
        {
          label: "Phase 2",
          title: "Viral Growth: Weeks 2 to 4",
          bullets: [
            "Daily Would You Rather threads",
            "Post poll results to create dopamine loops",
            "Launch the Normie Score concept",
            "Start leaderboards and percentile framing"
          ]
        },
        {
          label: "Phase 3",
          title: "Community Layer: Month 2",
          bullets: [
            "Launch Discord and Telegram",
            "Introduce Normie vs Outlier roles",
            "Enable token-gated polls",
            "Open community-driven question submissions"
          ]
        },
        {
          label: "Phase 4",
          title: "Data Layer: Month 3 and beyond",
          bullets: [
            "Build the Normie Index",
            "Track global behavior trends",
            "Launch poll analytics dashboards",
            "Publish insight content across blog and social"
          ]
        },
        {
          label: "Phase 5",
          title: "Expansion and monetization",
          bullets: [
            "Sponsored polls",
            "Brand partnerships",
            "Creator tools",
            "API access for behavioral data"
          ]
        }
      ]}
    />
  );
}
