"use client";

import { HomeFooterNote } from "@/src/site/home/partials/home-footer-note";
import { HomeHero } from "@/src/site/home/partials/home-hero";
import { PollStage } from "@/src/site/home/partials/poll-stage";
import { SiteShell } from "@/src/site/layout/site-shell";
import { usePollExperience } from "@/src/site/home/use-poll-experience";

export function HomePage() {
  const { error, isLoading, isSubmitting, isSubmittingSurvey, payload, submitAnswer, submitSurveyInterstitial } =
    usePollExperience();

  return (
    <SiteShell>
      {error ? <div className="notice error">{error}</div> : null}
      <PollStage
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        isSubmittingSurvey={isSubmittingSurvey}
        payload={payload}
        onSubmit={submitAnswer}
        onSubmitSurvey={submitSurveyInterstitial}
      />
      <HomeFooterNote />
    </SiteShell>
  );
}
