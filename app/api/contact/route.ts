import { NextResponse } from "next/server";
import { safeUserText } from "@/lib/admin-users";
import { reportError } from "@/lib/observability/report-error";
import { getRequestId } from "@/lib/observability/request-id";
import { withObservedRoute } from "@/lib/observability/with-api-route";
import { buildPublicUserFullName } from "@/lib/public-users";
import {
  getRequestClientIp,
  isHoneypotTriggered,
  isReasonableEmail,
  safePublicText
} from "@/lib/public-request";
import { consumePublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";

const CONTACT_RATE_LIMIT = 8;
const CONTACT_WINDOW_SECONDS = 60 * 60;

function buildFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export const POST = withObservedRoute("contact", async (request) => {
  const clientIp = getRequestClientIp(request);
  const rateLimit = await consumePublicRateLimit(
    `contact-form:ip:${clientIp}`,
    CONTACT_RATE_LIMIT,
    CONTACT_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    formMode?: unknown;
    companyWebsite?: unknown;
  };

  if (isHoneypotTriggered(body.companyWebsite)) {
    return NextResponse.json({
      ok: true,
      message: "Thanks. Your information has been saved."
    });
  }

  const firstName = safeUserText(body.firstName, 120);
  const lastName = safeUserText(body.lastName, 120);
  const email = safeUserText(body.email, 255).toLowerCase();
  const phone = safeUserText(body.phone, 80);
  const formMode = safePublicText(body.formMode, 40) || "squeeze";
  const fullName = buildFullName(firstName, lastName);

  if (!firstName) {
    return NextResponse.json({ error: "First name is required." }, { status: 400 });
  }

  if (!isReasonableEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const notes = [
    "Contact form submission",
    `Form type: ${formMode}`,
    `First name: ${firstName}`,
    lastName ? `Last name: ${lastName}` : "",
    phone ? `Phone: ${phone}` : "",
    `Email: ${email}`,
    `Submitted: ${new Date().toISOString()}`
  ]
    .filter(Boolean)
    .join("\n");

  // Service role required: public lead capture upserts into users with no anon RLS policy.
  const supabase = createAdminClient();
  const { error: profileError } = await supabase.from("users").upsert(
    {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName || buildPublicUserFullName(firstName, lastName, email),
      phone,
      status: "lead",
      source: "contact-form",
      notes,
      updated_at: new Date().toISOString()
    },
    { onConflict: "email" }
  );

  if (profileError) {
    const requestId = getRequestId(request);
    reportError("contact.upsert_failed", profileError, {
      requestId,
      formMode
    });

    const response = NextResponse.json(
      {
        error: profileError.message.includes("users")
          ? "Missing users table. Run the updated Supabase schema."
          : "We could not save your information. Please try again.",
        requestId
      },
      { status: 500 }
    );
    response.headers.set("x-request-id", requestId);
    return response;
  }

  return NextResponse.json({
    ok: true,
    message: "Thanks. Your information has been saved."
  });
});
