import { NextResponse } from "next/server";
import { safeUserText } from "@/lib/admin-users";
import { createAdminClient } from "@/lib/supabase-admin";

function buildFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

async function findAuthUserByEmail(email: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
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

  const supabase = createAdminClient();
  let authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone
      },
      app_metadata: {
        role: "viewer",
        source: "contact-form"
      }
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to save your contact details." },
        { status: 500 }
      );
    }

    authUser = data.user;
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

  const { error: profileError } = await supabase.from("users").upsert({
    id: authUser.id,
    full_name: fullName || safeUserText(authUser.user_metadata?.full_name, 255),
    role: "viewer",
    status: "invited",
    notes,
    updated_at: new Date().toISOString()
  });

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
