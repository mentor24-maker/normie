import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { SiteContentPage } from "@/src/site/content/site-content-page";

export default async function WhitePaperPage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("white-paper");

  if (dynamicPage) {
    return <DynamicPageShell page={dynamicPage} />;
  }

  return (
    <SiteContentPage
      eyebrow="White Paper"
      title="The deeper thesis behind Normie as a platform and ecosystem."
      intro={[
        "Normie is not just a poll site, a meme, or a comparison tool. It is a mirror and map of human behavior built from large-scale participation and real-time feedback loops.",
        "The long-term opportunity is to evolve from a viral poll engine into a behavioral intelligence platform with user, data, community, and token layers."
      ]}
      chips={["Mirror", "Map", "Behavioral intelligence"]}
      sections={[
        {
          label: "Core Product",
          title: "The user layer",
          bullets: [
            "Would You Rather polls",
            "Real-time results and percentage breakdowns",
            "Personal positioning on the bell curve",
            "Normie Score as a behavioral profile"
          ]
        },
        {
          label: "Insight Engine",
          title: "The data layer",
          copy: [
            "As participation grows, Normie becomes a living dataset of human behavior, values, beliefs, and decisions."
          ],
          bullets: [
            "Market research",
            "Consumer insights",
            "Trend forecasting",
            "Cultural and generational analysis"
          ]
        },
        {
          label: "Growth Flywheel",
          title: "How the system compounds",
          bullets: [
            "User answers a question",
            "Sees where they stand",
            "Gains insight",
            "Shares the result",
            "More users join",
            "Data grows",
            "Insights become more valuable"
          ]
        },
        {
          label: "Enterprise",
          title: "The monetization layer",
          bullets: [
            "Brand surveys",
            "Sponsored polls",
            "Consumer behavior analytics",
            "API access for insight products"
          ]
        }
      ]}
    />
  );
}
