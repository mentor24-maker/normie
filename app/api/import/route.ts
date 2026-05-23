import Papa from "papaparse";
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  buildStarcasterImportDiagnostics,
  importStarcasterPollRows,
  normalizeCsvHeader,
  normalizeCsvValue,
  parseStarcasterCsvText,
  shouldUseStarcasterImport
} from "@/lib/starcaster-poll-csv-import";
import { createAdminClient } from "@/lib/supabase-admin";

type ImportRow = Record<string, string>;

const ENDPOINT = "/api/import";

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

function parseWeight(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

function importFailure(
  auth: Awaited<ReturnType<typeof requireAdminRoute>>,
  message: string,
  diagnostics: ReturnType<typeof buildStarcasterImportDiagnostics>,
  status = 400
) {
  if ("response" in auth) {
    return auth.response;
  }

  return auth.finish(NextResponse.json({ error: message, diagnostics }, { status }));
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const importType = normalizeCsvValue(formData.get("import_type")?.toString()).toLowerCase();
  const isAdvancedImport = importType === "advanced";

  if (!(file instanceof File)) {
    return importFailure(auth, "A CSV file is required.", {
      importType,
      endpoint: ENDPOINT,
      rawHeaders: [],
      normalizedHeaders: [],
      useStarcasterImport: false,
      isStarcasterPollCsv: false,
      hasCategoryB: false,
      starcasterExpected: [],
      starcasterMissing: [],
      parsedRowCount: 0,
      importableRowCount: 0
    });
  }

  const csvText = await file.text();
  const starcasterParsed = parseStarcasterCsvText(csvText);
  const diagnostics = buildStarcasterImportDiagnostics(
    importType,
    ENDPOINT,
    starcasterParsed.rawHeaders,
    starcasterParsed.normalizedHeaders,
    starcasterParsed.rows.length,
    starcasterParsed.importableRows.length
  );

  if (starcasterParsed.parseErrors.length > 0) {
    return importFailure(
      auth,
      starcasterParsed.parseErrors[0]?.message ?? "Failed to parse CSV.",
      diagnostics
    );
  }

  const fields = diagnostics.normalizedHeaders;
  const useStarcasterImport = shouldUseStarcasterImport(importType, fields);
  diagnostics.useStarcasterImport = useStarcasterImport;

  if (useStarcasterImport) {
    if (starcasterParsed.importableRows.length === 0) {
      return importFailure(
        auth,
        "No importable poll rows found. Check that headers match the Starcaster export.",
        diagnostics
      );
    }

    try {
      const supabase = createAdminClient();
      const createdCount = await importStarcasterPollRows(supabase, starcasterParsed.importableRows);

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
        importError instanceof Error ? importError.message : "Starcaster import failed.",
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

  const rows = parsed.data
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), normalizeCsvValue(value)]))
    )
    .filter((row) => Object.values(row).some(Boolean));

  if (rows.length === 0) {
    return importFailure(auth, "The CSV file had no usable rows.", diagnostics);
  }

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
    return importFailure(
      auth,
      "This file looks like the Starcaster Would You Rather CSV (Category B, Option 1, Option B). Use Starcaster Import or POST /api/admin/polls/import-starcaster instead of the simple CSV import.",
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
