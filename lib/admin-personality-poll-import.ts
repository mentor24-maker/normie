import { NextResponse } from "next/server";
import type { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  buildPersonalityImportDiagnostics,
  importPersonalityPollRows,
  parsePersonalityCsvText
} from "@/lib/personality-poll-csv-import";
import type { PollCollection } from "@/lib/poll-collections";
import type { PersonalityFieldMap } from "@/lib/personality-poll-import";
import { createAdminClient } from "@/lib/supabase-admin";

type AuthResult = Awaited<ReturnType<typeof requireAdminRoute>>;

type PersonalityImportRouteConfig = {
  endpoint: string;
  importType: string;
  fieldMap: PersonalityFieldMap;
  collection: PollCollection;
  emptyRowsMessage: string;
};

export async function handlePersonalityPollImport(
  auth: AuthResult,
  request: Request,
  config: PersonalityImportRouteConfig
) {
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
          diagnostics: { endpoint: config.endpoint, reason: "missing_file" }
        },
        { status: 400 }
      )
    );
  }

  const csvText = await file.text();
  const parsed = parsePersonalityCsvText(csvText, config.fieldMap);

  const diagnostics = buildPersonalityImportDiagnostics(
    config.importType,
    config.endpoint,
    config.fieldMap,
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
          error: config.emptyRowsMessage,
          diagnostics
        },
        { status: 400 }
      )
    );
  }

  try {
    const supabase = createAdminClient();
    const createdCount = await importPersonalityPollRows(supabase, parsed.importableRows, config.collection);

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
          error: importError instanceof Error ? importError.message : "Import failed.",
          diagnostics
        },
        { status: 500 }
      )
    );
  }
}
