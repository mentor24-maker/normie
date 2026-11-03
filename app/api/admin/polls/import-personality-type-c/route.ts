import { requireAdminRoute } from "@/lib/admin-route-auth";
import { handlePersonalityPollImport } from "@/lib/admin-personality-poll-import";
import { POLL_COLLECTION_PERSONALITY_TYPE_A } from "@/lib/poll-collections";
import {
  PERSONALITY_TYPE_C_FIELDS,
  PERSONALITY_TYPE_C_IMPORT_TYPE
} from "@/lib/personality-poll-import";

const ENDPOINT = "/api/admin/polls/import-personality-type-c";

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  return handlePersonalityPollImport(auth, request, {
    endpoint: ENDPOINT,
    importType: PERSONALITY_TYPE_C_IMPORT_TYPE,
    fieldMap: PERSONALITY_TYPE_C_FIELDS,
    collection: POLL_COLLECTION_PERSONALITY_TYPE_A,
    emptyRowsMessage:
      "No importable poll rows found. Check that headers match the Personality Type C export."
  });
}
