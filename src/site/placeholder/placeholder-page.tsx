import { SiteShell } from "@/src/site/layout/site-shell";

export function PlaceholderPage({
  eyebrow,
  title,
  copy
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <SiteShell>
      <section className="hero">
        <div className="hero-card site-placeholder-card">
          <div className="page-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="page-copy">{copy}</p>
          <div className="hero-chip-row">
            <span className="hero-chip chip-sky">Coming next</span>
            <span className="hero-chip chip-cloud">Placeholder page</span>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
