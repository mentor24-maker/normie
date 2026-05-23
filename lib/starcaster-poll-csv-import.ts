import Papa from "papaparse";
import {
  isStarcasterPollCsv,
  mapStarcasterPollRow,
  STARCASTER_CSV_FIELDS,
  STARCASTER_IMPORT_TYPE,
  starcasterRowToPollInsert
} from "@/lib/starcaster-poll-import";
import type { SupabaseClient } from "@supabase/supabase-js";

type ImportRow = Record<string, string>;

export type StarcasterImportDiagnostics = {
  importType: string;
  endpoint: string;
  rawHeaders: string[];
  normalizedHeaders: string[];
  useStarcasterImport: boolean;
  isStarcasterPollCsv: boolean;
  hasCategoryB: boolean;
  starcasterExpected: string[];
  starcasterMissing: string[];
  parsedRowCount: number;
  importableRowCount: number;
};

export function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeCsvValue(value: string | undefined | null) {
  return (value ?? "").trim();
}

export function shouldUseStarcasterImport(importType: string, fields: string[]) {
  const normalizedType = importType.trim().toLowerCase();

  if (normalizedType === STARCASTER_IMPORT_TYPE) {
    return true;
  }

  // Legacy admin UI still posts import_type=advanced for this file.
  if (normalizedType === "advanced") {
    return true;
  }

  if (fields.includes(STARCASTER_CSV_FIELDS.category)) {
    return true;
  }

  return isStarcasterPollCsv(fields);
}

export function buildStarcasterImportDiagnostics(
  importType: string,
  endpoint: string,
  rawHeaders: string[],
  normalizedHeaders: string[],
  parsedRowCount: number,
  importableRowCount: number
): StarcasterImportDiagnostics {
  const starcasterExpected = Object.values(STARCASTER_CSV_FIELDS);

  return {
    importType: importType.trim() || "(none)",
    endpoint,
    rawHeaders,
    normalizedHeaders,
    useStarcasterImport: shouldUseStarcasterImport(importType, normalizedHeaders),
    isStarcasterPollCsv: isStarcasterPollCsv(normalizedHeaders),
    hasCategoryB: normalizedHeaders.includes(STARCASTER_CSV_FIELDS.category),
    starcasterExpected,
    starcasterMissing: starcasterExpected.filter((field) => !normalizedHeaders.includes(field)),
    parsedRowCount,
    importableRowCount
  };
}

export function parseStarcasterCsvText(csvText: string) {
  const parsed = Papa.parse<ImportRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeCsvHeader(header)
  });

  const rawHeaders = parsed.meta.fields ?? [];
  const normalizedHeaders = rawHeaders.map((field) => normalizeCsvHeader(field));
  const rows = parsed.data
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), normalizeCsvValue(value)])
      )
    )
    .filter((row) => Object.values(row).some(Boolean));

  const importableRows = rows
    .map((row) => mapStarcasterPollRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    parseErrors: parsed.errors,
    rawHeaders,
    normalizedHeaders,
    rows,
    importableRows
  };
}

export async function importStarcasterPollRows(
  supabase: SupabaseClient,
  importableRows: NonNullable<ReturnType<typeof mapStarcasterPollRow>>[]
) {
  const { data: lastPoll, error: lastPollError } = await supabase
    .from("polls")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPollError) {
    throw new Error(lastPollError.message);
  }

  let nextOrderIndex = (lastPoll?.order_index ?? 0) + 1;
  let createdCount = 0;

  for (const mapped of importableRows) {
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        ...starcasterRowToPollInsert(mapped),
        order_index: nextOrderIndex,
        is_published: true
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      throw new Error(pollError?.message ?? "Failed to create poll.");
    }

    const { error: optionError } = await supabase.from("poll_options").insert(
      mapped.options.map((label, index) => ({
        poll_id: poll.id,
        label,
        sort_order: index + 1
      }))
    );

    if (optionError) {
      throw new Error(optionError.message);
    }

    nextOrderIndex += 1;
    createdCount += 1;
  }

  return createdCount;
}
