import { NextResponse } from "next/server";
import { safeUserText } from "@/lib/admin-users";
import { buildPublicUserFullName } from "@/lib/public-users";
import { createAdminClient } from "@/lib/supabase-admin";

function buildFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    formMode?: unknown;
  };

  const firstName = safeUserText(body.firstName, 120);
  const lastName = safeUserText(body.lastName, 120);
  const email = safeUserText(body.email, 255).toLowerCase();
  const phone = safeUserText(body.phone, 80);
  const formMode = safeUserText(body.formMode, 40) || "squeeze";
  const fullName = buildFullName(firstName, lastName);

  if (!firstName) {
    return NextResponse.json({ error: "First name is required." }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
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
    return NextResponse.json(
      {
        error: profileError.message.includes("users")
          ? "Missing users table. Run the updated Supabase schema."
          : profileError.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Thanks. Your information has been saved."
  });
}
