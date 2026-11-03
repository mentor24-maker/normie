"use client";

import { useEffect } from "react";
import {
  buildAdminAuthCallbackPath,
  buildPlayerAuthCallbackPath,
  buildPlayerPasswordResetPath,
  shouldRouteAuthPayloadToAdminCallback,
  shouldRouteAuthPayloadToPlayerCallback,
  shouldRouteAuthPayloadToPlayerReset
} from "@/lib/admin-auth-hash-redirect";

export function AdminAuthHashRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;

    if (shouldRouteAuthPayloadToPlayerReset(pathname, search, hash)) {
      window.location.replace(buildPlayerPasswordResetPath(search, hash));
      return;
    }

    if (shouldRouteAuthPayloadToPlayerCallback(pathname, search, hash)) {
      window.location.replace(buildPlayerAuthCallbackPath(search, hash));
      return;
    }

    if (!shouldRouteAuthPayloadToAdminCallback(pathname, search, hash)) {
      return;
    }

    window.location.replace(buildAdminAuthCallbackPath(search, hash));
  }, []);

  return null;
}
