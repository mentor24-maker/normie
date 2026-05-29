import { NextResponse } from "next/server";
import { safePlayerText } from "@/lib/player-auth";
import { getPlayerAuthCallbackUrl } from "@/lib/site-url";
import { createPublicClient } from "@/lib/supabase-public";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: unknown };
  const email = safePlayerText(body.email, 255).toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getPlayerAuthCallbackUrl(request)
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is waiting for confirmation, a new confirmation link has been sent."
  });
}
