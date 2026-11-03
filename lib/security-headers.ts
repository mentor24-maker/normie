import type { NextResponse } from "next/server";
import { TRUSTED_EMBED_FRAME_ORIGINS } from "@/lib/embed-origins";

function getSupabaseOrigins() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!rawUrl) {
    return [];
  }

  try {
    return [new URL(rawUrl).origin];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy() {
  const supabaseOrigins = getSupabaseOrigins();
  const connectSources = [
    "'self'",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
    ...supabaseOrigins
  ];
  const imageSources = ["'self'", "data:", "blob:", "https:"];
  const frameSources = [
    "'self'",
    "https://accounts.google.com",
    ...TRUSTED_EMBED_FRAME_ORIGINS,
    ...supabaseOrigins
  ];

  for (const origin of supabaseOrigins) {
    const websocketOrigin = origin.replace(/^https:/, "wss:");
    connectSources.push(websocketOrigin);
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imageSources.join(" ")}`,
    `font-src 'self' data:`,
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    "object-src 'none'"
  ].join("; ");
}

export function applySecurityHeaders<T extends NextResponse>(response: T): T {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  return response;
}
