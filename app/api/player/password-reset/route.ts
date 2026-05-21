import { NextResponse } from "next/server";
import { safePlayerText } from "@/lib/player-auth";
import { createPublicClient } from "@/lib/supabase-public";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: unknown };
  const email = safePlayerText(body.email, 255).toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const redirectTo = new URL("/portal/reset", request.url).toString();
  const supabase = createPublicClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has a player account, a reset link has been sent."
  });
}
