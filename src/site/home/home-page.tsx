"use client";

import { HomeFooterNote } from "@/src/site/home/partials/home-footer-note";
import { HomeHero } from "@/src/site/home/partials/home-hero";
import { PollStage } from "@/src/site/home/partials/poll-stage";
import { SiteShell } from "@/src/site/layout/site-shell";
import { usePollExperience } from "@/src/site/home/use-poll-experience";

export function HomePage() {
  const { activeCategory, error, isLoading, isSubmitting, payload, submitAnswer } = usePollExperience();

  return (
    <SiteShell>
      {error ? <div className="notice error">{error}</div> : null}
      <PollStage
        activeCategory={activeCategory}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        payload={payload}
        onSubmit={submitAnswer}
      />
      <HomeFooterNote />
    </SiteShell>
  );
}
