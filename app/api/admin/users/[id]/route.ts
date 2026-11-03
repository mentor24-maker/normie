import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { safeUserText } from "@/lib/admin-users";
import {
  mergePublicUserRecord,
  normalizePublicUserStatus,
  type PublicUserRow
} from "@/lib/public-users";
import { normalizePlayerHandle } from "@/lib/player-auth";
import {
  assertTesterPollExists,
  normalizeIsTester,
  normalizeTesterPollId
} from "@/lib/player-tester-poll";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("users:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    handle?: unknown;
    status?: unknown;
    isTester?: unknown;
    testerPollId?: unknown;
  };

  const email = safeUserText(body.email, 255).toLowerCase();
  const password = safeUserText(body.password, 255);
  const fullName = safeUserText(body.fullName, 255);
  const handle = normalizePlayerHandle(body.handle, email);
  const status = normalizePublicUserStatus(body.status);
  const isTester = normalizeIsTester(body.isTester);
  const testerPollId = isTester ? normalizeTesterPollId(body.testerPollId) : null;

  if (!email || !email.includes("@")) {
    return auth.finish(NextResponse.json({ error: "A valid email is required." }, { status: 400 }));
  }

  if (password && password.length < 8) {
    return auth.finish(NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 }));
  }

  if (isTester) {
    const testerPollError = await assertTesterPollExists(testerPollId);

    if (testerPollError) {
      return auth.finish(NextResponse.json({ error: testerPollError }, { status: 400 }));
    }
  }

  const supabase = createAdminClient();
  const authUpdate: {
    email: string;
    password?: string;
    user_metadata: { full_name: string; handle: string };
  } = {
    email,
    user_metadata: { full_name: fullName, handle }
  };

  if (password) {
    authUpdate.password = password;
  }

  const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, authUpdate);

  if (updateError || !updatedUser.user) {
    return auth.finish(
      NextResponse.json({ error: updateError?.message ?? "Failed to update player user." }, { status: 500 })
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .upsert({
      id,
      full_name: fullName,
      handle,
      status,
      is_tester: isTester,
      tester_poll_id: testerPollId,
      updated_at: new Date().toISOString()
    })
    .select("id, full_name, handle, status, is_tester, tester_poll_id, crypto_wallets, created_at, updated_at")
    .single();

  if (profileError || !profile) {
    return auth.finish(
      NextResponse.json({ error: profileError?.message ?? "Failed to update player profile." }, { status: 500 })
    );
  }

  return auth.finish(NextResponse.json({ user: mergePublicUserRecord(updatedUser.user, profile as PublicUserRow) }));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("users:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();

  const cleanupResults = await Promise.all([
    supabase.from("poll_response").delete().eq("user_id", id),
    supabase.from("player_profiles").delete().eq("id", id)
  ]);
  const cleanupError = cleanupResults.find((result) => result.error)?.error;

  if (cleanupError) {
    return auth.finish(NextResponse.json({ error: cleanupError.message }, { status: 500 }));
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id);

  if (deleteAuthError) {
    return auth.finish(NextResponse.json({ error: deleteAuthError.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
