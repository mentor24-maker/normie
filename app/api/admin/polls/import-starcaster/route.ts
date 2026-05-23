import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  buildStarcasterImportDiagnostics,
  importStarcasterPollRows,
  parseStarcasterCsvText
} from "@/lib/starcaster-poll-csv-import";
import { STARCASTER_IMPORT_TYPE } from "@/lib/starcaster-poll-import";
import { createAdminClient } from "@/lib/supabase-admin";

const ENDPOINT = "/api/admin/polls/import-starcaster";

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return auth.finish(
      NextResponse.json(
        {
          error: "A CSV file is required.",
          diagnostics: { endpoint: ENDPOINT, reason: "missing_file" }
        },
        { status: 400 }
      )
    );
  }

  const csvText = await file.text();
  const parsed = parseStarcasterCsvText(csvText);

  const diagnostics = buildStarcasterImportDiagnostics(
    STARCASTER_IMPORT_TYPE,
    ENDPOINT,
    parsed.rawHeaders,
    parsed.normalizedHeaders,
    parsed.rows.length,
    parsed.importableRows.length
  );

  if (parsed.parseErrors.length > 0) {
    return auth.finish(
      NextResponse.json(
        {
          error: parsed.parseErrors[0]?.message ?? "Failed to parse CSV.",
          diagnostics
        },
        { status: 400 }
      )
    );
  }

  if (parsed.importableRows.length === 0) {
    return auth.finish(
      NextResponse.json(
        {
          error: "No importable poll rows found. Check that headers match the Starcaster export.",
          diagnostics
        },
        { status: 400 }
      )
    );
  }

  try {
    const supabase = createAdminClient();
    const createdCount = await importStarcasterPollRows(supabase, parsed.importableRows);

    return auth.finish(
      NextResponse.json({
        ok: true,
        createdCount,
        diagnostics: {
          ...diagnostics,
          createdCount
        }
      })
    );
  } catch (importError) {
    return auth.finish(
      NextResponse.json(
        {
          error: importError instanceof Error ? importError.message : "Starcaster import failed.",
          diagnostics
        },
        { status: 500 }
      )
    );
  }
}
