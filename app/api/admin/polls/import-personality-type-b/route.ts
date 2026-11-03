import { requireAdminRoute } from "@/lib/admin-route-auth";
import { handlePersonalityPollImport } from "@/lib/admin-personality-poll-import";
import { POLL_COLLECTION_PERSONALITY_TYPE_B } from "@/lib/poll-collections";
import {
  PERSONALITY_TYPE_B_FIELDS,
  PERSONALITY_TYPE_B_IMPORT_TYPE
} from "@/lib/personality-poll-import";

const ENDPOINT = "/api/admin/polls/import-personality-type-b";

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  return handlePersonalityPollImport(auth, request, {
    endpoint: ENDPOINT,
    importType: PERSONALITY_TYPE_B_IMPORT_TYPE,
    fieldMap: PERSONALITY_TYPE_B_FIELDS,
    collection: POLL_COLLECTION_PERSONALITY_TYPE_B,
    emptyRowsMessage:
      "No importable poll rows found. Check that headers match the Personality Type B export."
  });
}
