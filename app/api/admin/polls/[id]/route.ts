import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { applyPollGalleryImageUrlOnSave } from "@/lib/poll-gallery-link";
import { normalizeDeepDiveRelatedPollIds } from "@/lib/poll-deep-dive";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";
import { createAdminClient } from "@/lib/supabase-admin";

type PollOptionInput = {
  id?: unknown;
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
  "id, category, question, deep_dive, deep_dive_youtube_url, deep_dive_blog_post_id, deep_dive_related_poll_ids, image_url, order_index, created_at, is_published, is_hidden, poll_options(id, label, sort_order)";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:read");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("polls").select(POLL_SELECT).eq("id", id).maybeSingle();

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  if (!data) {
    return auth.finish(NextResponse.json({ error: "Poll not found." }, { status: 404 }));
  }

  const poll = {
    ...data,
    poll_options: [...(data.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  };

  return auth.finish(NextResponse.json({ poll }));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
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
  const orderIndex = safeInteger(body.order_index, NaN);
  const isPublished = Boolean(body.is_published);
  const deepDive = sanitizeRichTextHtml(safeText(body.deep_dive, 100000));
  const deepDiveYoutubeUrl = safeText(body.deep_dive_youtube_url, 2000);
  const deepDiveBlogPostId = safeText(body.deep_dive_blog_post_id, 120) || null;
  const deepDiveRelatedPollIds = normalizeDeepDiveRelatedPollIds(body.deep_dive_related_poll_ids);
  const pollOptions = Array.isArray(body.poll_options)
    ? body.poll_options
        .map((option, index) => ({
          id: safeText(option.id, 255),
          label: safeText(option.label, 1000),
          sort_order: safeInteger(option.sort_order, index)
        }))
        .filter((option) => option.id)
    : [];

  if (!question) {
    return auth.finish(NextResponse.json({ error: "Question is required." }, { status: 400 }));
  }

  if (!Number.isFinite(orderIndex)) {
    return auth.finish(NextResponse.json({ error: "Order must be a valid number." }, { status: 400 }));
  }

  if (pollOptions.length === 0 || pollOptions.some((option) => !option.label)) {
    return auth.finish(NextResponse.json({ error: "Each poll option must have text." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { error: pollError } = await supabase
    .from("polls")
    .update({
      category: category || null,
      question,
      image_url: imageUrl,
      deep_dive: deepDive,
      deep_dive_youtube_url: deepDiveYoutubeUrl,
      deep_dive_blog_post_id: deepDiveBlogPostId,
      deep_dive_related_poll_ids: deepDiveRelatedPollIds,
      order_index: orderIndex,
      is_published: isPublished
    })
    .eq("id", id);

  if (pollError) {
    return auth.finish(NextResponse.json({ error: pollError.message }, { status: 500 }));
  }

  const { error: optionsError } = await supabase.from("poll_options").upsert(
    pollOptions.map((option) => ({
      id: option.id,
      poll_id: id,
      label: option.label,
      sort_order: option.sort_order
    }))
  );

  if (optionsError) {
    return auth.finish(NextResponse.json({ error: optionsError.message }, { status: 500 }));
  }

  const { data, error: fetchError } = await supabase.from("polls").select(POLL_SELECT).eq("id", id).single();

  if (fetchError || !data) {
    return auth.finish(NextResponse.json(
      { error: fetchError?.message ?? "Poll updated, but the refreshed row could not be loaded." },
      { status: 500 }
    ));
  }

  return auth.finish(
    NextResponse.json({
      poll: {
        ...data,
        poll_options: [...(data.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      }
    })
  );
}
