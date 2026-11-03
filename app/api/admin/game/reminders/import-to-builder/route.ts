import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  countReminderRecordsInLayout,
  importLegacyGameRemindersIntoPageLayout
} from "@/lib/import-legacy-game-reminders";
import { GAME_REMINDER_SELECT_COLUMNS, gameReminderToClient } from "@/lib/game-reminder";
import { rowToBuilderPage, safeText, serializeBuilderDocument } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

function normalizePageSlug(value: string | null): string {
  const slug = safeText(value ?? "home", 255)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "home";
}

export async function GET(request: Request) {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const slug = normalizePageSlug(searchParams.get("slug"));
  const supabase = createAdminClient();

  const [{ count: legacyCount, error: legacyError }, { data: pageRow, error: pageError }] = await Promise.all([
    supabase.from("game_reminders").select("id", { count: "exact", head: true }),
    supabase
      .from("pages")
      .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
      .eq("slug", slug)
      .maybeSingle()
  ]);

  if (legacyError) {
    return auth.finish(
      NextResponse.json({ error: legacyError.message ?? "Failed to count legacy reminders." }, { status: 500 })
    );
  }

  if (pageError) {
    return auth.finish(
      NextResponse.json({ error: pageError.message ?? "Failed to load page." }, { status: 500 })
    );
  }

  const page = pageRow ? rowToBuilderPage(pageRow) : null;

  return auth.finish(
    NextResponse.json({
      slug,
      legacyCount: legacyCount ?? 0,
      page: page
        ? {
            id: page.id,
            name: page.name,
            slug: page.slug,
            isPublished: page.isPublished
          }
        : null,
      builderRecordCount: page ? countReminderRecordsInLayout(page.layoutSections) : 0
    })
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = normalizePageSlug(typeof body.slug === "string" ? body.slug : null);
  const supabase = createAdminClient();

  const { data: legacyRows, error: legacyError } = await supabase
    .from("game_reminders")
    .select(GAME_REMINDER_SELECT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (legacyError) {
    return auth.finish(
      NextResponse.json({ error: legacyError.message ?? "Failed to load legacy reminders." }, { status: 500 })
    );
  }

  const legacyReminders = (legacyRows ?? []).map((row) => gameReminderToClient(row));

  const { data: pageRow, error: pageError } = await supabase
    .from("pages")
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (pageError) {
    return auth.finish(
      NextResponse.json({ error: pageError.message ?? "Failed to load page." }, { status: 500 })
    );
  }

  if (!pageRow) {
    return auth.finish(
      NextResponse.json({ error: `No page found with slug "${slug}". Create the page in Page Builder first.` }, { status: 404 })
    );
  }

  const page = rowToBuilderPage(pageRow);
  const importResult = importLegacyGameRemindersIntoPageLayout(page.layoutSections, legacyReminders);

  const { data: updatedRow, error: updateError } = await supabase
    .from("pages")
    .update({
      layout_sections: serializeBuilderDocument({
        pageBackground: page.pageBackground,
        layoutSections: importResult.layoutSections
      }),
      updated_at: new Date().toISOString()
    })
    .eq("id", page.id)
    .select("id, name, slug, template_id, layout_sections, is_published, created_at, updated_at")
    .single();

  if (updateError || !updatedRow) {
    return auth.finish(
      NextResponse.json({ error: updateError?.message ?? "Failed to save imported reminders to the page." }, { status: 500 })
    );
  }

  const updatedPage = rowToBuilderPage(updatedRow);

  return auth.finish(
    NextResponse.json({
      ok: true,
      slug,
      legacyCount: legacyReminders.length,
      importedCount: importResult.importedCount,
      skippedCount: importResult.skippedCount,
      totalBuilderRecords: importResult.totalBuilderRecords,
      createdReminderModule: importResult.createdReminderModule,
      reminderModuleId: importResult.reminderModuleId,
      page: updatedPage
    })
  );
}
