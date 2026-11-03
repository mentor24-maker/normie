import {
  createDefaultPollPods,
  normalizePollPodsInput,
  parsePollPodsFromRow,
  validatePollPodsInput,
  type PollPodsSnapshot,
  type PollSettingsSnapshot
} from "@/lib/poll-pod-config";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";

export type { PollSettingsSnapshot } from "@/lib/poll-pod-config";

export type PollSettings = PollSettingsSnapshot & {
  updatedAt: string | null;
};

const POLL_SETTINGS_SELECT_WITH_PODS =
  "pod_configs, previous_results_empty_eyebrow, previous_results_empty_content_html, pod_background_color, header_background_color, header_font_color, header_font_size, header_border_size, header_border_color, header_drop_shadow_enabled, header_drop_shadow_x, header_drop_shadow_y, header_drop_shadow_blur, header_drop_shadow_color, header_drop_shadow_opacity, question_area_width, answer_button_a_background, answer_button_b_background, answer_button_a_border_size, answer_button_b_border_size, answer_button_a_border_color, answer_button_b_border_color, answer_button_a_font_color, answer_button_b_font_color, answer_button_a_font_size, answer_button_b_font_size, updated_at";

const POLL_SETTINGS_SELECT_WITHOUT_FONT_SIZE =
  "pod_configs, previous_results_empty_eyebrow, previous_results_empty_content_html, pod_background_color, header_background_color, header_font_color, header_font_size, header_border_size, header_border_color, header_drop_shadow_enabled, header_drop_shadow_x, header_drop_shadow_y, header_drop_shadow_blur, header_drop_shadow_color, header_drop_shadow_opacity, question_area_width, answer_button_a_background, answer_button_b_background, answer_button_a_border_size, answer_button_b_border_size, answer_button_a_border_color, answer_button_b_border_color, answer_button_a_font_color, answer_button_b_font_color, updated_at";

const POLL_SETTINGS_SELECT_PODS_ONLY = "pod_configs, updated_at";

const POLL_SETTINGS_SELECT_LEGACY =
  "previous_results_empty_eyebrow, previous_results_empty_content_html, pod_background_color, header_background_color, header_font_color, header_font_size, header_border_size, header_border_color, header_drop_shadow_enabled, header_drop_shadow_x, header_drop_shadow_y, header_drop_shadow_blur, header_drop_shadow_color, header_drop_shadow_opacity, question_area_width, answer_button_a_background, answer_button_b_background, answer_button_a_border_size, answer_button_b_border_size, answer_button_a_border_color, answer_button_b_border_color, answer_button_a_font_color, answer_button_b_font_color, updated_at";

const POLL_SETTINGS_SELECT_QUERIES = [
  POLL_SETTINGS_SELECT_WITH_PODS,
  POLL_SETTINGS_SELECT_WITHOUT_FONT_SIZE,
  POLL_SETTINGS_SELECT_PODS_ONLY,
  POLL_SETTINGS_SELECT_LEGACY
] as const;

function isMissingSchemaColumn(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    message.includes("schema cache") ||
    (message.includes("column") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("not found")))
  );
}

function rowToPollSettings(row: Record<string, unknown> | null): PollSettings {
  return {
    pods: parsePollPodsFromRow(row),
    updatedAt: row?.updated_at ? String(row.updated_at) : null
  };
}

async function fetchPollSettingsRow(
  supabase: ReturnType<typeof createPublicClient> | ReturnType<typeof createAdminClient>
) {
  let lastError: { message?: string } | null = null;

  for (const select of POLL_SETTINGS_SELECT_QUERIES) {
    const result = await supabase.from("poll_settings").select(select).eq("id", "default").maybeSingle();

    if (!result.error) {
      return result;
    }

    lastError = result.error;

    if (!isMissingSchemaColumn(result.error)) {
      break;
    }
  }

  return { data: null, error: lastError };
}

export function normalizePollSettingsInput(body: Record<string, unknown>) {
  return {
    pods: normalizePollPodsInput(body.pods ? body : { pods: body })
  };
}

export function validatePollSettingsInput(input: ReturnType<typeof normalizePollSettingsInput>) {
  return validatePollPodsInput(input.pods);
}

function podsToLegacyColumns(pods: PollPodsSnapshot) {
  const polls = pods.polls;
  const initial = pods.initial_page.content ?? createDefaultPollPods().initial_page.content!;

  return {
    previous_results_empty_eyebrow: initial.headerLabel,
    previous_results_empty_content_html: initial.contentHtml,
    pod_background_color: polls.layout.podBackgroundColor,
    header_background_color: polls.layout.headerBackgroundColor,
    header_font_color: polls.layout.headerFontColor,
    header_font_size: polls.layout.headerFontSize,
    header_border_size: polls.layout.headerBorderSize,
    header_border_color: polls.layout.headerBorderColor,
    header_drop_shadow_enabled: polls.layout.headerDropShadowEnabled,
    header_drop_shadow_x: polls.layout.headerDropShadowX,
    header_drop_shadow_y: polls.layout.headerDropShadowY,
    header_drop_shadow_blur: polls.layout.headerDropShadowBlur,
    header_drop_shadow_color: polls.layout.headerDropShadowColor,
    header_drop_shadow_opacity: polls.layout.headerDropShadowOpacity,
    question_area_width: polls.layout.contentWidth,
    answer_button_a_background: polls.answerButtons?.answerButtonABackground ?? "#ffffff",
    answer_button_b_background: polls.answerButtons?.answerButtonBBackground ?? "#ffffff",
    answer_button_a_border_size: polls.answerButtons?.answerButtonABorderSize ?? "1",
    answer_button_b_border_size: polls.answerButtons?.answerButtonBBorderSize ?? "1",
    answer_button_a_border_color: polls.answerButtons?.answerButtonABorderColor ?? "#091018",
    answer_button_b_border_color: polls.answerButtons?.answerButtonBBorderColor ?? "#091018",
    answer_button_a_font_color: polls.answerButtons?.answerButtonAFontColor ?? "#091018",
    answer_button_b_font_color: polls.answerButtons?.answerButtonBFontColor ?? "#091018",
    answer_button_a_font_size: polls.answerButtons?.answerButtonAFontSize ?? "1",
    answer_button_b_font_size: polls.answerButtons?.answerButtonBFontSize ?? "1"
  };
}

function legacyRowWithoutFontSizeColumns<T extends Record<string, unknown>>(row: T) {
  const { answer_button_a_font_size, answer_button_b_font_size, ...rest } = row;
  return rest;
}

export async function getPublicPollSettings(): Promise<PollSettings> {
  try {
    const supabase = createPublicClient();
    const result = await fetchPollSettingsRow(supabase);

    if (result.error) {
      return rowToPollSettings(null);
    }

    return rowToPollSettings((result.data as unknown as Record<string, unknown> | null) ?? null);
  } catch {
    return rowToPollSettings(null);
  }
}

export async function getAdminPollSettings() {
  try {
    const supabase = createAdminClient();
    const result = await fetchPollSettingsRow(supabase);

    if (result.error) {
      return rowToPollSettings(null);
    }

    return rowToPollSettings((result.data as unknown as Record<string, unknown> | null) ?? null);
  } catch {
    return rowToPollSettings(null);
  }
}

export async function saveAdminPollSettings(input: ReturnType<typeof normalizePollSettingsInput>) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const legacyRow = {
    id: "default",
    ...podsToLegacyColumns(input.pods),
    updated_at: now
  };

  const saveAttempts: Array<{
    payload: Record<string, unknown>;
    select: (typeof POLL_SETTINGS_SELECT_QUERIES)[number];
  }> = [
    {
      payload: {
        ...legacyRow,
        pod_configs: input.pods
      },
      select: POLL_SETTINGS_SELECT_WITH_PODS
    },
    {
      payload: {
        id: "default",
        pod_configs: input.pods,
        updated_at: now
      },
      select: POLL_SETTINGS_SELECT_PODS_ONLY
    },
    {
      payload: legacyRowWithoutFontSizeColumns(legacyRow),
      select: POLL_SETTINGS_SELECT_LEGACY
    }
  ];

  let lastError: { message?: string } | null = null;

  for (const attempt of saveAttempts) {
    const result = await supabase
      .from("poll_settings")
      .upsert(attempt.payload, { onConflict: "id" })
      .select(attempt.select)
      .single();

    if (!result.error && result.data) {
      return rowToPollSettings((result.data as unknown as Record<string, unknown>) ?? null);
    }

    lastError = result.error;

    if (!isMissingSchemaColumn(result.error)) {
      break;
    }
  }

  throw new Error(
    lastError?.message ??
      "Failed to save poll settings. Run supabase/migrations/007_poll_pod_configs.sql and 008_poll_answer_button_font_size.sql in the Supabase SQL Editor."
  );
}

export function pollSettingsToClientPayload(settings: PollSettings) {
  return {
    pods: settings.pods
  };
}
