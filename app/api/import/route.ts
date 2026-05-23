import Papa from "papaparse";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  buildPersonalityImportDiagnostics,
  importPersonalityPollRows,
  normalizeCsvHeader,
  normalizeCsvValue,
  parsePersonalityTypeACsvText,
  parsePersonalityTypeBCsvText
} from "@/lib/personality-poll-csv-import";
import {
  PERSONALITY_TYPE_A_FIELDS,
  PERSONALITY_TYPE_B_FIELDS,
  resolvePersonalityImportKind
} from "@/lib/personality-poll-import";
import {
  POLL_COLLECTION_PERSONALITY_TYPE_A,
  POLL_COLLECTION_PERSONALITY_TYPE_B,
  POLL_COLLECTION_STANDARD
} from "@/lib/poll-collections";
import { createAdminClient } from "@/lib/supabase-admin";

type ImportRow = Record<string, string>;

const ENDPOINT = "/api/import";

function importFailure(
  auth: Awaited<ReturnType<typeof requireAdminRoute>>,
  message: string,
  diagnostics: ReturnType<typeof buildPersonalityImportDiagnostics>,
  status = 400
) {
  if ("response" in auth) {
    return auth.response;
  }

  return auth.finish(NextResponse.json({ error: message, diagnostics }, { status }));
}

function emptyDiagnostics(importType: string): ReturnType<typeof buildPersonalityImportDiagnostics> {
  return buildPersonalityImportDiagnostics(
    importType,
    ENDPOINT,
    PERSONALITY_TYPE_A_FIELDS,
    [],
    [],
    0,
    0
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const importType = normalizeCsvValue(formData.get("import_type")?.toString()).toLowerCase();

  if (!(file instanceof File)) {
    return importFailure(auth, "A CSV file is required.", emptyDiagnostics(importType));
  }

  const csvText = await file.text();
  const typeAParsed = parsePersonalityTypeACsvText(csvText);
  const fields = typeAParsed.normalizedHeaders;
  const personalityKind = resolvePersonalityImportKind(importType, fields);

  if (personalityKind) {
    const parsed =
      personalityKind === "b" ? parsePersonalityTypeBCsvText(csvText) : typeAParsed;
    const fieldMap = personalityKind === "b" ? PERSONALITY_TYPE_B_FIELDS : PERSONALITY_TYPE_A_FIELDS;
    const diagnostics = buildPersonalityImportDiagnostics(
      importType,
      ENDPOINT,
      fieldMap,
      parsed.rawHeaders,
      parsed.normalizedHeaders,
      parsed.rows.length,
      parsed.importableRows.length
    );

    if (parsed.parseErrors.length > 0) {
      return importFailure(
        auth,
        parsed.parseErrors[0]?.message ?? "Failed to parse CSV.",
        diagnostics
      );
    }

    if (parsed.importableRows.length === 0) {
      return importFailure(
        auth,
        `No importable poll rows found. Check that headers match Personality Type ${personalityKind === "b" ? "B" : "A"}.`,
        diagnostics
      );
    }

    try {
      const supabase = createAdminClient();
      const collection =
        personalityKind === "b" ? POLL_COLLECTION_PERSONALITY_TYPE_B : POLL_COLLECTION_PERSONALITY_TYPE_A;
      const createdCount = await importPersonalityPollRows(supabase, parsed.importableRows, collection);

      return auth.finish(
        NextResponse.json({
          ok: true,
          createdCount,
          diagnostics: { ...diagnostics, createdCount }
        })
      );
    } catch (importError) {
      return importFailure(
        auth,
        importError instanceof Error ? importError.message : "Personality import failed.",
        diagnostics,
        500
      );
    }
  }

  const parsed = Papa.parse<ImportRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeCsvHeader(header)
  });

  const diagnostics = buildPersonalityImportDiagnostics(
    importType,
    ENDPOINT,
    PERSONALITY_TYPE_A_FIELDS,
    parsed.meta.fields ?? [],
    fields,
    parsed.data.length,
    0
  );

  const rows = parsed.data
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), normalizeCsvValue(value)]))
    )
    .filter((row) => Object.values(row).some(Boolean));

  if (rows.length === 0) {
    return importFailure(auth, "The CSV file had no usable rows.", diagnostics);
  }

  const questionField = fields.includes("question") ? "question" : null;
  const categoryField = fields.includes("category") ? "category" : null;
  const optionFields = fields.filter((field) => /^option(?:_|$)/.test(field));

  if (!questionField || !categoryField || optionFields.length < 2) {
    return importFailure(
      auth,
      "This file looks like a personality import CSV. Use Personality Type A or B in Poll Manager, or Standard Upload for Category / Question / Option_A / Option_B only.",
      diagnostics
    );
  }

  const supabase = createAdminClient();

  const { data: lastPoll, error: lastPollError } = await supabase
    .from("polls")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPollError) {
    return importFailure(auth, lastPollError.message, diagnostics, 500);
  }

  let nextOrderIndex = (lastPoll?.order_index ?? 0) + 1;
  let createdCount = 0;

  for (const row of rows) {
    const category = normalizeCsvValue(row[categoryField]);
    const question = normalizeCsvValue(row[questionField]);
    const options = optionFields.map((field) => normalizeCsvValue(row[field])).filter(Boolean);

    if (!category || !question || options.length < 2) {
      return importFailure(
        auth,
        `Each row needs a category, a question, and at least two options. Problem row: ${JSON.stringify(row)}`,
        diagnostics
      );
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        category,
        question,
        collection: POLL_COLLECTION_STANDARD,
        order_index: nextOrderIndex,
        is_published: true
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      return importFailure(auth, pollError?.message ?? "Failed to create poll.", diagnostics, 500);
    }

    const { error: optionError } = await supabase.from("poll_options").insert(
      options.map((label, index) => ({
        poll_id: poll.id,
        label,
        sort_order: index + 1
      }))
    );

    if (optionError) {
      return importFailure(auth, optionError.message, diagnostics, 500);
    }

    nextOrderIndex += 1;
    createdCount += 1;
  }

  return auth.finish(NextResponse.json({ ok: true, createdCount, diagnostics }));
}
