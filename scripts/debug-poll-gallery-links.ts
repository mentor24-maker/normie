/**
 * Local diagnostic: npx tsx scripts/debug-poll-gallery-links.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when env vars are already exported.
  }
}

loadEnvLocal();
import {
  pollHasGalleryImageLink,
  resolvePollGalleryStorageName
} from "../lib/poll-gallery-link-core";
import { loadGalleryStorageNamesReferencedByPolls } from "../lib/poll-gallery-link";
import { loadAllPollIdQuestionImageUrlRows } from "../lib/poll-rows-pagination";

async function main() {
  const rows = await loadAllPollIdQuestionImageUrlRows();
  const pollFilterNames = await loadGalleryStorageNamesReferencedByPolls();
  const withImage = rows.filter((row) => String(row.image_url ?? "").trim().length > 0);
  const linked = withImage.filter((row) => pollHasGalleryImageLink(row.image_url));

  console.log(`polls total (paginated): ${rows.length}`);
  console.log(`polls with image_url: ${withImage.length}`);
  console.log(`gallery-linked (parsed): ${linked.length}`);
  console.log(`poll filter storage names: ${pollFilterNames.length}`);
  console.log(pollFilterNames.slice(0, 20).join("\n") || "(none)");

  for (const row of withImage.filter((r) => !pollHasGalleryImageLink(r.image_url)).slice(0, 15)) {
    console.log("--- unlinked");
    console.log("question:", row.question.slice(0, 60));
    console.log("image_url:", String(row.image_url).slice(0, 160));
    console.log("parsed storage:", resolvePollGalleryStorageName(row.image_url) || "(none)");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
