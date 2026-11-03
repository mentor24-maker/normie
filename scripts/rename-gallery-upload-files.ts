/**
 * Rename legacy gallery uploads from `{timestamp}-{base}.ext` to `{base}-{6digits}.ext`
 * in Storage, gallery_media, and JSON/text columns that reference public gallery URLs.
 *
 * Usage:
 *   npx tsx scripts/rename-gallery-upload-files.ts --dry-run
 *   npx tsx scripts/rename-gallery-upload-files.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isLegacyGalleryTimestampPrefixName,
  legacyGalleryFileNameToNewName
} from "../lib/gallery-upload-filename";
import { createAdminClient } from "../lib/supabase-admin";

const STORAGE_PAGE_SIZE = 1000;

type RenamePlan = {
  from: string;
  to: string;
};

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

function isDryRun() {
  return process.argv.includes("--dry-run");
}

function replaceGalleryFileNamesInText(value: string, replacements: Map<string, string>) {
  let next = value;

  for (const [from, to] of replacements) {
    if (!next.includes(from)) {
      continue;
    }

    next = next.split(from).join(to);
  }

  return next;
}

function replaceGalleryFileNamesInJson(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === "string") {
    return replaceGalleryFileNamesInText(value, replacements);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceGalleryFileNamesInJson(entry, replacements));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceGalleryFileNamesInJson(entry, replacements)])
    );
  }

  return value;
}

async function listGalleryStorageFiles() {
  const supabase = createAdminClient();
  const names: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from("gallery").list("", {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) {
      throw error;
    }

    const page = (data ?? []).map((entry) => entry.name).filter((name) => name !== ".emptyFolderPlaceholder");
    names.push(...page);

    if (page.length < STORAGE_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return names;
}

function buildRenamePlans(fileNames: string[]): RenamePlan[] {
  const reserved = new Set(fileNames);
  const plans: RenamePlan[] = [];

  for (const from of fileNames) {
    if (!isLegacyGalleryTimestampPrefixName(from)) {
      continue;
    }

    let to = legacyGalleryFileNameToNewName(from);

    if (!to || to === from) {
      continue;
    }

    let suffix = 1;

    while (reserved.has(to)) {
      const extensionIndex = to.lastIndexOf(".");

      if (extensionIndex < 0) {
        break;
      }

      const stem = to.slice(0, extensionIndex);
      const extension = to.slice(extensionIndex);
      to = `${stem}-${suffix}${extension}`;
      suffix += 1;
    }

    reserved.add(to);
    plans.push({ from, to });
  }

  return plans;
}

async function renameStorageObject(from: string, to: string, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] storage move ${from} -> ${to}`);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from("gallery").move(from, to);

  if (error) {
    throw new Error(`Storage move failed for ${from}: ${error.message}`);
  }
}

async function migrateGalleryMediaRow(from: string, to: string, dryRun: boolean) {
  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("gallery_media")
    .select("storage_name, badge, media_category, media_type, aspect, created_at, updated_at")
    .eq("storage_name", from)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    if (dryRun) {
      console.log(`[dry-run] gallery_media: no row for ${from}`);
    }
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] gallery_media ${from} -> ${to}`);
    return;
  }

  const { error: deleteError } = await supabase.from("gallery_media").delete().eq("storage_name", from);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await supabase.from("gallery_media").upsert({
    storage_name: to,
    badge: existing.badge,
    media_category: existing.media_category ?? "",
    media_type: existing.media_type ?? "",
    aspect: existing.aspect ?? "square",
    created_at: existing.created_at,
    updated_at: new Date().toISOString()
  });

  if (insertError) {
    throw insertError;
  }
}

async function updateJsonColumn(
  table: string,
  idColumn: string,
  jsonColumn: string,
  replacements: Map<string, string>,
  dryRun: boolean
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from(table).select(`${idColumn}, ${jsonColumn}`);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const id = String(row[idColumn] ?? "");
    const current = row[jsonColumn];

    if (!current) {
      continue;
    }

    const next = replaceGalleryFileNamesInJson(current, replacements);
    const changed = JSON.stringify(current) !== JSON.stringify(next);

    if (!changed) {
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${table}.${jsonColumn} ${id}`);
      continue;
    }

    const { error: updateError } = await supabase.from(table).update({ [jsonColumn]: next }).eq(idColumn, id);

    if (updateError) {
      throw updateError;
    }
  }
}

async function updateTextColumn(
  table: string,
  idColumn: string,
  textColumn: string,
  replacements: Map<string, string>,
  dryRun: boolean
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from(table).select(`${idColumn}, ${textColumn}`);

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const id = String(row[idColumn] ?? "");
    const current = String(row[textColumn] ?? "");

    if (!current) {
      continue;
    }

    const next = replaceGalleryFileNamesInText(current, replacements);

    if (next === current) {
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${table}.${textColumn} ${id}`);
      continue;
    }

    const { error: updateError } = await supabase.from(table).update({ [textColumn]: next }).eq(idColumn, id);

    if (updateError) {
      throw updateError;
    }
  }
}

async function main() {
  loadEnvLocal();
  const dryRun = isDryRun();
  const fileNames = await listGalleryStorageFiles();
  const plans = buildRenamePlans(fileNames);

  if (plans.length === 0) {
    console.log("No legacy timestamp-prefixed gallery files found.");
    return;
  }

  console.log(`${dryRun ? "Planning" : "Applying"} ${plans.length} rename(s):`);

  for (const plan of plans) {
    console.log(`  ${plan.from} -> ${plan.to}`);
  }

  const replacements = new Map(plans.map((plan) => [plan.from, plan.to]));

  for (const plan of plans) {
    await renameStorageObject(plan.from, plan.to, dryRun);
    await migrateGalleryMediaRow(plan.from, plan.to, dryRun);
  }

  await updateJsonColumn("pages", "id", "layout_sections", replacements, dryRun);
  await updateJsonColumn("page_templates", "id", "layout_sections", replacements, dryRun);
  await updateJsonColumn("builder_cell_modules", "id", "modules", replacements, dryRun);
  await updateJsonColumn("builder_saved_sections", "id", "section", replacements, dryRun);
  await updateJsonColumn("game_rewards", "id", "metadata", replacements, dryRun);
  await updateTextColumn("polls", "id", "image_url", replacements, dryRun);
  await updateTextColumn("blog_posts", "id", "featured_image_url", replacements, dryRun);
  await updateTextColumn("blog_posts", "id", "og_image_url", replacements, dryRun);
  await updateTextColumn("products", "id", "image_url", replacements, dryRun);

  console.log(dryRun ? "Dry run complete." : "Gallery rename migration complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
