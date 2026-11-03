"use client";

import { useEffect } from "react";
import { isLocalDevHost } from "@/lib/local-dev-host";

/**
 * Next.js 15 devtools show a bottom-edge building/rendering indicator on App Router
 * transitions. `devIndicators: false` only sets `__NEXT_DEV_INDICATOR` (static/ISR chip);
 * the overlay still renders until `disableDevIndicator` is set in devtools config.
 */
export function DevIndicatorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const host = window.location.host;
    if (!isLocalDevHost(host)) {
      return;
    }

    void fetch("/__nextjs_disable_dev_indicator", { method: "POST" }).catch(() => {
      // Dev server may not expose the route yet on first paint.
    });

    void fetch("/__nextjs_devtools_config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disableDevIndicator: true })
    }).catch(() => {
      // Same as above.
    });
  }, []);

  return null;
}
