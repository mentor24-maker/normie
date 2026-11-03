import Papa from "papaparse";
import {
  isPersonalityTypeACsv,
  isPersonalityTypeBCsv,
  mapPersonalityPollRow,
  resolvePersonalityImportKind,
  type PersonalityFieldMap,
  type PersonalityPollRow,
  personalityRowToPollInsert,
  PERSONALITY_TYPE_A_FIELDS,
  PERSONALITY_TYPE_A_IMPORT_TYPE,
  PERSONALITY_TYPE_B_FIELDS,
  PERSONALITY_TYPE_B_IMPORT_TYPE,
  STARCASTER_IMPORT_TYPE
} from "@/lib/personality-poll-import";
import type { PollCollection } from "@/lib/poll-collections";
import { resolvePollCategoryIdForWrite } from "@/lib/poll-category-store";
import type { SupabaseClient } from "@supabase/supabase-js";

type ImportRow = Record<string, string>;

export type PersonalityImportDiagnostics = {
  importType: string;
  endpoint: string;
  rawHeaders: string[];
  normalizedHeaders: string[];
  personalityKind: "a" | "b" | null;
  isPersonalityTypeA: boolean;
  isPersonalityTypeB: boolean;
  expectedFields: string[];
  missingFields: string[];
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

type ExpectedFieldEntry = {
  label: string;
  keys: string[];
};

function buildExpectedFieldEntries(fields: PersonalityFieldMap): ExpectedFieldEntry[] {
  const entries: ExpectedFieldEntry[] = [];
  const pushSingle = (key: string | undefined) => {
    if (!key) {
      return;
    }

    entries.push({ label: key, keys: [key] });
  };

  pushSingle(fields.category);
  pushSingle(fields.personalitySystem);
  pushSingle(fields.traitDimension);
  pushSingle(fields.option1);
  pushSingle(fields.optionB);

  if (fields.questionFallback) {
    entries.push({
      label: `${fields.question} (or ${fields.questionFallback})`,
      keys: [fields.question, fields.questionFallback]
    });
  } else {
    pushSingle(fields.question);
  }

  pushSingle(fields.optionAScoreCode);
  pushSingle(fields.optionBScoreCode);
  pushSingle(fields.scoringLogic);
  pushSingle(fields.weight);
  pushSingle(fields.reverseScored);
  pushSingle(fields.aiInterpretationTag);
  pushSingle(fields.sourceQuestionId);

  const deduped = new Map<string, ExpectedFieldEntry>();

  for (const entry of entries) {
    const signature = [...new Set(entry.keys)].sort().join("|");

    if (!deduped.has(signature)) {
      deduped.set(signature, {
        label: entry.label,
        keys: [...new Set(entry.keys)]
      });
    }
  }

  return [...deduped.values()];
}

export function buildPersonalityImportDiagnostics(
  importType: string,
  endpoint: string,
  fieldMap: PersonalityFieldMap,
  rawHeaders: string[],
  normalizedHeaders: string[],
  parsedRowCount: number,
  importableRowCount: number
): PersonalityImportDiagnostics {
  const expectedEntries = buildExpectedFieldEntries(fieldMap);

  return {
    importType: importType.trim() || "(none)",
    endpoint,
    rawHeaders,
    normalizedHeaders,
    personalityKind: fieldMap === PERSONALITY_TYPE_B_FIELDS ? "b" : "a",
    isPersonalityTypeA: isPersonalityTypeACsv(normalizedHeaders),
    isPersonalityTypeB: isPersonalityTypeBCsv(normalizedHeaders),
    expectedFields: expectedEntries.map((entry) => entry.label),
    missingFields: expectedEntries
      .filter((entry) => !entry.keys.some((key) => normalizedHeaders.includes(key)))
      .map((entry) => entry.label),
    parsedRowCount,
    importableRowCount
  };
}

export function parsePersonalityCsvText(csvText: string, fieldMap: PersonalityFieldMap) {
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
    .map((row) => mapPersonalityPollRow(row, fieldMap))
    .filter((row): row is PersonalityPollRow => row !== null);

  return {
    parseErrors: parsed.errors,
    rawHeaders,
    normalizedHeaders,
    rows,
    importableRows
  };
}

export async function importPersonalityPollRows(
  supabase: SupabaseClient,
  importableRows: PersonalityPollRow[],
  collection: PollCollection
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
    const insertPayload = personalityRowToPollInsert(mapped, collection);
    const categoryId = await resolvePollCategoryIdForWrite(supabase, insertPayload.category);
    const { category: _category, ...pollFields } = insertPayload;

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        ...pollFields,
        category_id: categoryId,
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

export function shouldUsePersonalityImport(importType: string, fields: string[]) {
  return resolvePersonalityImportKind(importType, fields) !== null;
}

/** @deprecated Use shouldUsePersonalityImport */
export function shouldUseStarcasterImport(importType: string, fields: string[]) {
  return resolvePersonalityImportKind(importType, fields) === "a";
}

export function parseStarcasterCsvText(csvText: string) {
  return parsePersonalityCsvText(csvText, PERSONALITY_TYPE_A_FIELDS);
}

export function parsePersonalityTypeACsvText(csvText: string) {
  return parsePersonalityCsvText(csvText, PERSONALITY_TYPE_A_FIELDS);
}

export function parsePersonalityTypeBCsvText(csvText: string) {
  return parsePersonalityCsvText(csvText, PERSONALITY_TYPE_B_FIELDS);
}

export function buildStarcasterImportDiagnostics(
  importType: string,
  endpoint: string,
  rawHeaders: string[],
  normalizedHeaders: string[],
  parsedRowCount: number,
  importableRowCount: number
) {
  return buildPersonalityImportDiagnostics(
    importType || PERSONALITY_TYPE_A_IMPORT_TYPE,
    endpoint,
    PERSONALITY_TYPE_A_FIELDS,
    rawHeaders,
    normalizedHeaders,
    parsedRowCount,
    importableRowCount
  );
}

/** @deprecated Use importPersonalityPollRows */
export const importStarcasterPollRows = importPersonalityPollRows;

/** @deprecated */
export type StarcasterImportDiagnostics = PersonalityImportDiagnostics;

export { PERSONALITY_TYPE_A_IMPORT_TYPE, PERSONALITY_TYPE_B_IMPORT_TYPE, STARCASTER_IMPORT_TYPE };
