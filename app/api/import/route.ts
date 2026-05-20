import Papa from "papaparse";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type ImportRow = Record<string, string>;

function normalizeValue(value: string | undefined | null) {
  return (value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

function parseWeight(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const importType = normalizeValue(formData.get("import_type")?.toString()).toLowerCase();
  const isAdvancedImport = importType === "advanced";

  if (!(file instanceof File)) {
    return auth.finish(NextResponse.json({ error: "A CSV file is required." }, { status: 400 }));
  }

  const csvText = await file.text();
  const parsed = Papa.parse<ImportRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeHeader(header)
  });

  if (parsed.errors.length > 0) {
    return auth.finish(
      NextResponse.json({ error: parsed.errors[0]?.message ?? "Failed to parse CSV." }, { status: 400 })
    );
  }

  const fields = (parsed.meta.fields ?? []).map((field) => normalizeHeader(field));
  const questionField = fields.includes("question")
    ? "question"
    : isAdvancedImport && fields.includes("one_line_question")
      ? "one_line_question"
      : null;
  const categoryField = fields.includes("category") ? "category" : null;
  const optionFields = isAdvancedImport
    ? ["option_a", "option_b"].filter((field) => fields.includes(field))
    : fields.filter((field) => /^option(?:_|$)/.test(field));

  if (!questionField || !categoryField || optionFields.length < 2) {
    return auth.finish(
      NextResponse.json(
        {
          error:
            "CSV must include Category, Question, and at least two option columns such as Option_A and Option_B."
        },
        { status: 400 }
      )
    );
  }

  if (isAdvancedImport) {
    const requiredFields = [
      "question_id",
      "category",
      "personality_system",
      "trait_dimension",
      "option_a",
      "option_b",
      "one_line_question",
      "option_a_score_code",
      "option_b_score_code",
      "scoring_logic",
      "weight",
      "reverse_scored",
      "ai_interpretation_tag"
    ];
    const missingFields = requiredFields.filter((field) => !fields.includes(field));

    if (missingFields.length > 0) {
      return auth.finish(
        NextResponse.json(
          {
            error: `Advanced CSV is missing required column(s): ${missingFields.join(", ")}.`
          },
          { status: 400 }
        )
      );
    }
  }

  const rows = parsed.data
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), normalizeValue(value)]))
    )
    .filter((row) => Object.values(row).some(Boolean));

  if (rows.length === 0) {
    return auth.finish(NextResponse.json({ error: "The CSV file had no usable rows." }, { status: 400 }));
  }

  const supabase = createAdminClient();

  const { data: lastPoll, error: lastPollError } = await supabase
    .from("polls")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPollError) {
    return auth.finish(NextResponse.json({ error: lastPollError.message }, { status: 500 }));
  }

  let nextOrderIndex = (lastPoll?.order_index ?? 0) + 1;
  let createdCount = 0;

  for (const row of rows) {
    const category = normalizeValue(row[categoryField]);
    const question = normalizeValue(row[questionField]);
    const options = optionFields.map((field) => normalizeValue(row[field])).filter(Boolean);

    if (!category || !question || options.length < 2) {
      return auth.finish(
        NextResponse.json(
          {
            error:
              `Each row needs a category, a question, and at least two options. Problem row: ${JSON.stringify(row)}`
          },
          { status: 400 }
        )
      );
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        category,
        question,
        ...(isAdvancedImport
          ? {
              source_question_id: normalizeValue(row.question_id),
              personality_system: normalizeValue(row.personality_system),
              trait_dimension: normalizeValue(row.trait_dimension),
              option_a_score_code: normalizeValue(row.option_a_score_code),
              option_b_score_code: normalizeValue(row.option_b_score_code),
              scoring_logic: normalizeValue(row.scoring_logic),
              scoring_weight: parseWeight(normalizeValue(row.weight)),
              reverse_scored: parseBoolean(normalizeValue(row.reverse_scored)),
              ai_interpretation_tag: normalizeValue(row.ai_interpretation_tag)
            }
          : {}),
        order_index: nextOrderIndex,
        is_published: true
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      return auth.finish(
        NextResponse.json({ error: pollError?.message ?? "Failed to create poll." }, { status: 500 })
      );
    }

    const { error: optionError } = await supabase.from("poll_options").insert(
      options.map((label, index) => ({
        poll_id: poll.id,
        label,
        sort_order: index + 1
      }))
    );

    if (optionError) {
      return auth.finish(NextResponse.json({ error: optionError.message }, { status: 500 }));
    }

    nextOrderIndex += 1;
    createdCount += 1;
  }

  return auth.finish(NextResponse.json({ ok: true, createdCount }));
}
