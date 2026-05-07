import Image from "next/image";
import logoWide from "@/images/logo_normie_3_1600x500.png";

export function HomeHero() {
  return (
    <section className="hero">
      <div className="hero-card">
        <div className="hero-top-row">
          <div className="hero-copy hero-copy-compact">
            <div className="page-eyebrow">Know Yourself. See the Pattern.</div>
            <h1>Turn simple choices into real-time insight about where you stand.</h1>
            <p className="page-copy">
              Normie blends psychology, data, and culture into a living poll engine that shows how
              your instincts, values, and decisions compare with everyone else.
            </p>
            <div className="hero-chip-row">
              <span className="hero-chip chip-sky">Self-awareness</span>
              <span className="hero-chip chip-gold">Behavioral data</span>
              <span className="hero-chip chip-cloud">Live comparison</span>
            </div>
          </div>

          <div className="hero-logo-shell">
            <div className="hero-logo-card hero-banner-card">
              <Image
                alt="Normie banner"
                className="hero-logo hero-banner"
                priority
                src={logoWide}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
