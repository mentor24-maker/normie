import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { resetPollTestBrowserData } from "@/lib/poll-test-browser-reset";
import { isUuid, safePublicText } from "@/lib/public-request";

export const POST = withObservedRoute("dev.poll-test-reset", async (request) => {
  const cookieStore = await cookies();
  const body = (await request.json().catch(() => ({}))) as { backupSessionId?: unknown };
  const backupSessionId = safePublicText(body.backupSessionId, 120);

  return resetPollTestBrowserData(request, cookieStore, {
    backupSessionId: backupSessionId && isUuid(backupSessionId) ? backupSessionId : null
  });
});

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
