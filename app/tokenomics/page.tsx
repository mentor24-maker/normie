import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { SiteContentPage } from "@/src/site/content/site-content-page";

export default async function TokenomicsPage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("tokenomics");

  if (dynamicPage) {
    return <DynamicPageShell page={dynamicPage} />;
  }

  return (
    <SiteContentPage
      eyebrow="Tokenomics"
      title="Simple launch mechanics, clear narrative, long-term utility."
      intro={[
        "The launch model is intentionally simple and Pump.fun-friendly, with the narrative doing the heavy lifting at the beginning.",
        "The long-term opportunity is to connect participation, influence, and premium insight back into the ecosystem over time."
      ]}
      chips={["1B supply", "0% tax", "Fair launch"]}
      sections={[
        {
          label: "Launch Model",
          title: "Initial token structure",
          bullets: [
            "Total Supply: 1,000,000,000",
            "Tax: 0%",
            "Liquidity: Auto via bonding curve",
            "Ownership: Renounced after launch",
            "Fair Launch: No presale and no team allocation"
          ]
        },
        {
          label: "Future Utility",
          title: "Planned token-enabled features",
          bullets: [
            "Premium polls access",
            "Boosted visibility for polls",
            "Voting weight and influence",
            "Access to Normie Index dashboards",
            "Creator rewards"
          ]
        },
        {
          label: "Positioning",
          title: "How the token fits the platform",
          bullets: [
            "Meme coin plus psychology",
            "Data plus behavior layer",
            "Social identity token",
            "Engagement flywheel coin"
          ]
        }
      ]}
    />
  );
}
