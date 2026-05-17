"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "ui.route.error",
        context: {
          message: error.message,
          digest: error.digest ?? null
        }
      })
    );
  }, [error]);

  return (
    <main className="incident-shell">
      <section className="incident-card">
        <p className="incident-eyebrow">Something went wrong</p>
        <h1>We hit a snag loading this page.</h1>
        <p>Try again. If the problem continues, note the reference below when you contact support.</p>
        {error.digest ? <p className="incident-reference">Reference: {error.digest}</p> : null}
        <button type="button" className="incident-button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
