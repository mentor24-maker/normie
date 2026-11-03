"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        event: "ui.global.error",
        context: {
          message: error.message,
          digest: error.digest ?? null
        }
      })
    );
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="incident-shell">
          <section className="incident-card">
            <p className="incident-eyebrow">Application error</p>
            <h1>Normie is temporarily unavailable.</h1>
            <p>Refresh the page or try again in a moment.</p>
            {error.digest ? <p className="incident-reference">Reference: {error.digest}</p> : null}
            <button type="button" className="incident-button" onClick={() => reset()}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
