import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
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
    poll_options?: PollOptionInput[];
  };

  const category = safeText(body.category, 255);
  const question = safeText(body.question, 4000);
  const imageUrl = normalizeBuilderAssetUrl(body.image_url);
  const orderIndex = safeInteger(body.order_index, NaN);
  const isPublished = Boolean(body.is_published);
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

  const { data, error: fetchError } = await supabase
    .from("polls")
    .select("id, category, question, image_url, order_index, created_at, is_published, poll_options(id, label, sort_order)")
    .eq("id", id)
    .single();

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
