import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  applyPollGalleryImageUrlOnSave,
  loadGalleryExistenceNameSets,
  pollHasGalleryFileInStorageWithSets,
  syncPollGalleryImageLinks
} from "@/lib/poll-gallery-link";
import { normalizeDeepDiveRelatedPollIds } from "@/lib/poll-deep-dive";
import {
  allocatePollOrderIndexWithRetry,
  getNextPollOrderIndex,
  isPollOrderIndexUniqueViolation
} from "@/lib/poll-order-index";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";
import { POLL_COLLECTION_STANDARD } from "@/lib/poll-collections";
import { createAdminClient } from "@/lib/supabase-admin";

type PollOptionInput = {
  label?: unknown;
  sort_order?: unknown;
};

function safeText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function safeInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const POLL_SELECT =
  "id, category, collection, question, deep_dive, deep_dive_youtube_url, deep_dive_blog_post_id, deep_dive_related_poll_ids, image_url, order_index, created_at, is_published, is_hidden, poll_options(id, label, sort_order)";

export async function GET(request: Request) {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const syncGalleryLinks =
    new URL(request.url).searchParams.get("sync_gallery_links")?.trim().toLowerCase() === "1";

  if (syncGalleryLinks) {
    try {
      await syncPollGalleryImageLinks();
    } catch (syncError) {
      return auth.finish(
        NextResponse.json(
          {
            error:
              syncError instanceof Error ? syncError.message : "Failed to sync poll gallery image links."
          },
          { status: 500 }
        )
      );
    }
  }

  const supabase = createAdminClient();
  const [pollsResult, galleryExistence] = await Promise.all([
    supabase.from("polls").select(POLL_SELECT).order("order_index", { ascending: true }),
    loadGalleryExistenceNameSets()
  ]);

  if (pollsResult.error) {
    return auth.finish(NextResponse.json({ error: pollsResult.error.message }, { status: 500 }));
  }

  const polls = (pollsResult.data ?? []).map((poll) => ({
    ...poll,
    poll_options: [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    gallery_linked: pollHasGalleryFileInStorageWithSets(poll.image_url, galleryExistence)
  }));

  const { count: totalAnswers, error: responsesError } = await supabase
    .from("poll_response")
    .select("id", { count: "exact", head: true });

  if (responsesError) {
    return auth.finish(NextResponse.json({ error: responsesError.message }, { status: 500 }));
  }

  return auth.finish(
    NextResponse.json({
      polls,
      metrics: {
        questionCount: polls.length,
        totalAnswers: totalAnswers ?? 0
      }
    })
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as {
    category?: unknown;
    question?: unknown;
    image_url?: unknown;
    order_index?: unknown;
    is_published?: unknown;
    deep_dive?: unknown;
    deep_dive_youtube_url?: unknown;
    deep_dive_blog_post_id?: unknown;
    deep_dive_related_poll_ids?: unknown;
    poll_options?: PollOptionInput[];
  };

  const category = safeText(body.category, 255);
  const question = safeText(body.question, 4000);
  const imageUrl = await applyPollGalleryImageUrlOnSave(body.image_url);
  const requestedOrder = safeInteger(body.order_index, NaN);
  const isPublished = Boolean(body.is_published);
  const deepDive = sanitizeRichTextHtml(safeText(body.deep_dive, 100000));
  const deepDiveYoutubeUrl = safeText(body.deep_dive_youtube_url, 2000);
  const deepDiveBlogPostId = safeText(body.deep_dive_blog_post_id, 120) || null;
  const deepDiveRelatedPollIds = normalizeDeepDiveRelatedPollIds(body.deep_dive_related_poll_ids);
  const pollOptions = Array.isArray(body.poll_options)
    ? body.poll_options
        .map((option, index) => ({
          label: safeText(option.label, 1000),
          sort_order: safeInteger(option.sort_order, index + 1)
        }))
        .filter((option) => option.label)
    : [];

  if (!question) {
    return auth.finish(NextResponse.json({ error: "Question is required." }, { status: 400 }));
  }

  if (pollOptions.length < 2) {
    return auth.finish(NextResponse.json({ error: "At least two poll options are required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  let orderIndex = await allocatePollOrderIndexWithRetry(
    supabase,
    Number.isFinite(requestedOrder) ? requestedOrder : undefined
  );

  let poll: { id: string } | null = null;
  let pollError: { message: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase
      .from("polls")
      .insert({
        category: category || null,
        collection: POLL_COLLECTION_STANDARD,
        question,
        image_url: imageUrl,
        deep_dive: deepDive,
        deep_dive_youtube_url: deepDiveYoutubeUrl,
        deep_dive_blog_post_id: deepDiveBlogPostId,
        deep_dive_related_poll_ids: deepDiveRelatedPollIds,
        order_index: orderIndex,
        is_published: isPublished
      })
      .select("id")
      .single();

    poll = result.data;
    pollError = result.error;

    if (!pollError && poll) {
      break;
    }

    if (pollError && isPollOrderIndexUniqueViolation(pollError.message)) {
      orderIndex = await getNextPollOrderIndex(supabase);
      continue;
    }

    break;
  }

  if (pollError || !poll) {
    return auth.finish(NextResponse.json({ error: pollError?.message ?? "Failed to create poll." }, { status: 500 }));
  }

  const { error: optionsError } = await supabase.from("poll_options").insert(
    pollOptions.map((option) => ({
      poll_id: poll.id,
      label: option.label,
      sort_order: option.sort_order
    }))
  );

  if (optionsError) {
    return auth.finish(NextResponse.json({ error: optionsError.message }, { status: 500 }));
  }

  const { data, error: fetchError } = await supabase.from("polls").select(POLL_SELECT).eq("id", poll.id).single();

  if (fetchError || !data) {
    return auth.finish(
      NextResponse.json(
        { error: fetchError?.message ?? "Poll created, but the refreshed row could not be loaded." },
        { status: 500 }
      )
    );
  }

  return auth.finish(
    NextResponse.json(
      {
        poll: {
          ...data,
          poll_options: [...(data.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
        }
      },
      { status: 201 }
    )
  );
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json()) as { pollIds?: string[] };
  const pollIds = (body.pollIds ?? []).map((id) => id.trim()).filter(Boolean);

  if (pollIds.length === 0) {
    return auth.finish(NextResponse.json({ error: "At least one poll id is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("polls").delete().in("id", pollIds);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true, deletedCount: pollIds.length }));
}
