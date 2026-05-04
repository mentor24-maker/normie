import Papa from "papaparse";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type ImportRow = Record<string, string>;

function normalizeValue(value: string | undefined | null) {
  return (value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export async function POST(request: Request) {
  const adminKey = request.headers.get("x-import-admin-key");

  if (!process.env.IMPORT_ADMIN_KEY || adminKey !== process.env.IMPORT_ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized import request." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const csvText = await file.text();
  const parsed = Papa.parse<ImportRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeHeader(header)
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: parsed.errors[0]?.message ?? "Failed to parse CSV." }, { status: 400 });
  }

  const fields = (parsed.meta.fields ?? []).map((field) => normalizeHeader(field));
  const questionField = fields.includes("question") ? "question" : null;
  const categoryField = fields.includes("category") ? "category" : null;
  const optionFields = fields.filter((field) => /^option(?:_|$)/.test(field));

  if (!questionField || !categoryField || optionFields.length < 2) {
    return NextResponse.json(
      {
        error:
          "CSV must include Category, Question, and at least two option columns such as Option_A and Option_B."
      },
      { status: 400 }
    );
  }

  const rows = parsed.data
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), normalizeValue(value)]))
    )
    .filter((row) => Object.values(row).some(Boolean));

  if (rows.length === 0) {
    return NextResponse.json({ error: "The CSV file had no usable rows." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: lastPoll, error: lastPollError } = await supabase
    .from("polls")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPollError) {
    return NextResponse.json({ error: lastPollError.message }, { status: 500 });
  }

  let nextOrderIndex = (lastPoll?.order_index ?? 0) + 1;
  let createdCount = 0;

  for (const row of rows) {
    const category = normalizeValue(row[categoryField]);
    const question = normalizeValue(row[questionField]);
    const options = optionFields.map((field) => normalizeValue(row[field])).filter(Boolean);

    if (!category || !question || options.length < 2) {
      return NextResponse.json(
        {
          error:
            `Each row needs a category, a question, and at least two options. Problem row: ${JSON.stringify(row)}`
        },
        { status: 400 }
      );
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        category,
        question,
        order_index: nextOrderIndex,
        is_published: true
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: pollError?.message ?? "Failed to create poll." }, { status: 500 });
    }

    const { error: optionError } = await supabase.from("poll_options").insert(
      options.map((label, index) => ({
        poll_id: poll.id,
        label,
        sort_order: index + 1
      }))
    );

    if (optionError) {
      return NextResponse.json({ error: optionError.message }, { status: 500 });
    }

    nextOrderIndex += 1;
    createdCount += 1;
  }

  return NextResponse.json({ ok: true, createdCount });
}
