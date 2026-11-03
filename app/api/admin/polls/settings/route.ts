import { NextResponse } from "next/server";
import {
  getAdminPollSettings,
  normalizePollSettingsInput,
  pollSettingsToClientPayload,
  saveAdminPollSettings,
  validatePollSettingsInput
} from "@/lib/poll-settings";
import { requireAdminRoute } from "@/lib/admin-route-auth";

export async function GET() {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const settings = await getAdminPollSettings();
    return auth.finish(NextResponse.json({ settings: pollSettingsToClientPayload(settings) }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load poll settings." },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as Record<string, unknown>;
  const input = normalizePollSettingsInput(body);
  const validationError = validatePollSettingsInput(input);

  if (validationError) {
    return auth.finish(NextResponse.json({ error: validationError }, { status: 400 }));
  }

  try {
    const settings = await saveAdminPollSettings(input);
    return auth.finish(NextResponse.json({ settings: pollSettingsToClientPayload(settings) }));
  } catch (error) {
    return auth.finish(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save poll settings." },
        { status: 500 }
      )
    );
  }
}
