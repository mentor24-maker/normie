"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_SESSION_EXPIRED_CODE,
  ADMIN_SESSION_EXPIRED_EVENT,
  dispatchAdminSessionExpired,
  handleAdminSessionExpired,
  isAdminApiRequestUrl,
  isAdminPublicAuthRequest
} from "@/lib/admin-session-client";

const SESSION_CHECK_INTERVAL_MS = 4 * 60 * 1000;

type SessionStatus = "valid" | "expired" | "unavailable";

async function verifyAdminSession(): Promise<SessionStatus> {
  try {
    const response = await fetch("/api/admin/session", {
      cache: "no-store",
      credentials: "include"
    });

    if (response.ok) {
      return "valid";
    }

    if (response.status === 401 || response.status === 403) {
      return "expired";
    }

    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export function AdminSessionGuard() {
  const router = useRouter();
  const isHandlingExpiry = useRef(false);

  useEffect(() => {
    async function expireSession() {
      if (isHandlingExpiry.current) {
        return;
      }

      isHandlingExpiry.current = true;

      try {
        await handleAdminSessionExpired(router);
      } finally {
        isHandlingExpiry.current = false;
      }
    }

    async function checkSession() {
      const status = await verifyAdminSession();

      if (status === "expired") {
        await expireSession();
      }
    }

    function handleExpiredEvent() {
      void expireSession();
    }

    function handleWindowFocus() {
      void checkSession();
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const request =
        typeof args[0] === "string"
          ? null
          : args[0] instanceof Request
            ? args[0]
            : null;
      const requestUrl =
        typeof args[0] === "string"
          ? args[0]
          : request?.url ?? "";
      const requestMethod =
        request?.method ??
        (typeof args[1] === "object" && args[1] && "method" in args[1] && args[1].method
          ? String(args[1].method)
          : "GET");

      if (
        response.status === 401 &&
        isAdminApiRequestUrl(requestUrl) &&
        !isAdminPublicAuthRequest(requestUrl, requestMethod)
      ) {
        try {
          const clone = response.clone();
          const payload = (await clone.json()) as { code?: string };

          if (payload.code === ADMIN_SESSION_EXPIRED_CODE) {
            dispatchAdminSessionExpired();
          }
        } catch {
          // Ignore non-JSON 401 responses; login failures are handled in the form.
        }
      }

      return response;
    };

    const intervalId = window.setInterval(() => {
      void checkSession();
    }, SESSION_CHECK_INTERVAL_MS);

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiredEvent);

    return () => {
      window.fetch = originalFetch;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiredEvent);
    };
  }, [router]);

  return null;
}
