"use client";

import { useEffect } from "react";
import {
  buildAdminAuthCallbackPath,
  shouldRouteAuthPayloadToAdminCallback
} from "@/lib/admin-auth-hash-redirect";

export function AdminAuthHashRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;

    if (!shouldRouteAuthPayloadToAdminCallback(pathname, search, hash)) {
      return;
    }

    window.location.replace(buildAdminAuthCallbackPath(search, hash));
  }, []);

  return null;
}
