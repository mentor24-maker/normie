import { NextResponse } from "next/server";
import { getDeployMetadata } from "@/lib/observability/deploy-metadata";
import { checkSupabaseHealth } from "@/lib/observability/health";
import { logWarn } from "@/lib/observability/logger";
import { getRequestId } from "@/lib/observability/request-id";

function isAuthorizedDetailedHealth(request: Request) {
  const configured = process.env.HEALTH_CHECK_TOKEN?.trim();

  if (!configured) {
    return false;
  }

  const headerToken = request.headers.get("x-health-token")?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  return headerToken === configured || bearerToken === configured;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const supabase = await checkSupabaseHealth();
  const ok = supabase.ok;
  const includeDetails = isAuthorizedDetailedHealth(request);

  if (!ok) {
    logWarn("health.degraded", {
      requestId,
      supabaseLatencyMs: supabase.latencyMs,
      supabaseError: supabase.error
    });
  }

  const body: Record<string, unknown> = {
    status: ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: {
      supabase: {
        ok: supabase.ok,
        latencyMs: supabase.latencyMs
      }
    }
  };

  if (includeDetails) {
    body.deploy = getDeployMetadata();

    if (!supabase.ok) {
      body.checks = {
        supabase: {
          ok: supabase.ok,
          latencyMs: supabase.latencyMs,
          error: supabase.error
        }
      };
    }
  }

  const response = NextResponse.json(body, { status: ok ? 200 : 503 });
  response.headers.set("x-request-id", requestId);
  return response;
}
