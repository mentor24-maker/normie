import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const SESSION_COOKIE = "poll_session_id";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing poll session. Refresh and try again." }, { status: 400 });
  }

  const body = (await request.json()) as { pollId?: string; optionId?: string };
  const pollId = body.pollId?.trim();
  const optionId = body.optionId?.trim();

  if (!pollId || !optionId) {
    return NextResponse.json({ error: "pollId and optionId are required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("responses")
    .select("id")
    .eq("session_id", sessionId)
    .eq("poll_id", pollId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { error } = await supabase.from("responses").insert({
    session_id: sessionId,
    poll_id: pollId,
    option_id: optionId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
