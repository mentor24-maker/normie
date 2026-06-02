"use client";

import { useCallback, useEffect, useState } from "react";
import { isLocalDevHost } from "@/lib/local-dev-host";
import {
  clearPollTestClientCookies,
  requestPollTestBrowserReset
} from "@/lib/poll-test-browser-reset-client";

export function SiteHeaderDevResetButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setIsVisible(isLocalDevHost(window.location.host));
  }, []);

  const resetSession = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      await requestPollTestBrowserReset();
      clearPollTestClientCookies();
      window.location.reload();
    } catch {
      setIsBusy(false);
    }
  }, [isBusy]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      className="site-header-dev-reset-button"
      disabled={isBusy}
      onClick={() => {
        void resetSession();
      }}
      title="Clear cookies, delete poll responses for this browser, and reload as a new visitor."
    >
      {isBusy ? "Resetting…" : "Reset"}
    </button>
  );
}
