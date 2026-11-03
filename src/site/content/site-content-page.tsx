import Link from "next/link";
import { SiteShell } from "@/src/site/layout/site-shell";

type ContentSection = {
  label: string;
  title: string;
  copy?: string[];
  bullets?: string[];
};

type LinkItem = {
  href: string;
  label: string;
};

export function SiteContentPage({
  eyebrow,
  title,
  intro,
  chips = [],
  sections,
  links = []
}: {
  eyebrow: string;
  title: string;
  intro: string[];
  chips?: string[];
  sections: ContentSection[];
  links?: LinkItem[];
}) {
  return (
    <SiteShell>
      <section className="hero">
        <div className="hero-card site-content-hero">
          <div className="page-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <div className="site-content-copy">
            {intro.map((paragraph) => (
              <p className="page-copy" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
          {chips.length > 0 ? (
            <div className="hero-chip-row">
              {chips.map((chip, index) => (
                <span
                  className={`hero-chip ${index % 3 === 0 ? "chip-sky" : index % 3 === 1 ? "chip-gold" : "chip-cloud"}`}
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          {links.length > 0 ? (
            <div className="site-link-row">
              {links.map((link) => (
                <Link className="site-link-pill" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="site-section-grid">
        {sections.map((section) => (
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
