import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { SiteContentPage } from "@/src/site/content/site-content-page";

export default async function ContactPage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("contact");

  if (dynamicPage) {
    return <DynamicPageShell page={dynamicPage} />;
  }

  return (
    <SiteContentPage
      eyebrow="Contact"
      title="Find Normie across web and community channels."
      intro={[
        "The project already has a live web presence and community links. This page collects them in one place so visitors can move from the site into the broader ecosystem.",
        "We can always expand this later with a contact form, community CTAs, or media requests."
      ]}
      links={[
        { href: "https://normie.one/", label: "Website" },
        { href: "https://x.com/normie765714", label: "Twitter / X" },
        { href: "http://t.me/normieone", label: "Telegram" }
      ]}
      sections={[
        {
          label: "Community",
          title: "Primary channels",
          bullets: [
            "Website: normie.one",
            "Twitter: x.com/normie765714",
            "Telegram: t.me/normieone"
          ]
        },
        {
          label: "Messaging",
          title: "What people should feel when they land here",
          bullets: [
            "Know yourself",
            "Understand others",
            "See the pattern"
          ]
        }
      ]}
    />
  );
}
