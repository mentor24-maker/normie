import Image from "next/image";
import logoSquare from "@/images/logo_normie_3_1000x1000.png";
import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { SiteShell } from "@/src/site/layout/site-shell";

const aboutSections = [
  {
    label: "Mission",
    title: "Why Normie exists",
    copy: [
      "Normie exists to help people discover who they are in relation to others, not to label them as average, but to build awareness, perspective, and deeper understanding."
    ],
    bullets: [
      "See where they stand in the bell curve",
      "Understand their values, instincts, and decisions",
      "Explore how society thinks about meaningful questions",
      "Develop greater self-awareness and empathy for others"
    ]
  },
  {
    label: "Summary",
    title: "What the platform reveals",
    copy: [
      "Normie transforms simple questions into powerful reflections on identity, beliefs, morals, decision-making, and social behavior.",
      "Users do not just answer questions. They gain context about where they align, where they differ, and how their thinking compares with others."
    ],
    bullets: ["Identity", "Beliefs", "Morals", "Decision-making", "Social behavior"]
  },
  {
    label: "Philosophy",
    title: "The principles behind the experience",
    bullets: [
      "Self-awareness over comparison",
      "Data over assumptions",
      "Insight over validation",
      "Curiosity over judgment"
    ]
  }
];

export default async function AboutPage() {
  const dynamicPage = await getPublishedBuilderPageBySlug("about");

  if (dynamicPage) {
    return <DynamicPageShell page={dynamicPage} />;
  }

  return (
    <SiteShell>
      <section className="hero">
        <div className="hero-card about-hero-card">
          <div className="page-eyebrow">About Normie</div>
          <div className="about-hero-grid">
            <div className="about-hero-left">
              <div className="about-logo-shell">
                <Image alt="Normie logo" className="about-logo" priority src={logoSquare} />
              </div>
              <h1 className="about-hero-title">A mirror for human behavior, values, and identity.</h1>
            </div>

            <div className="intro-panel site-content-panel about-hero-copy-panel">
              <p className="panel-copy">
                Normie is a next-generation platform that blends psychology, data, and culture to
                help people better understand themselves and the world around them.
              </p>
              <div className="hero-chip-row">
                <span className="hero-chip chip-sky">Self-awareness</span>
                <span className="hero-chip chip-gold">Behavioral data</span>
                <span className="hero-chip chip-cloud">Collective insight</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section-grid">
        {aboutSections.map((section) => (
          <article className="intro-panel site-content-panel" key={section.title}>
            <div className="panel-label">{section.label}</div>
            <h2>{section.title}</h2>
            {section.copy?.map((paragraph) => (
              <p className="panel-copy" key={paragraph}>
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="site-bullet-list">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
