import {
  buildDeepDiveBlogCard,
  buildPollDeepDiveContent,
  mergeDeepDiveRelatedPolls,
  normalizeDeepDiveRelatedPollIds,
  type PollDeepDiveContent
} from "@/lib/poll-deep-dive";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePollCategoryIlikeExact } from "@/lib/poll-categories";

type PollDeepDiveRow = {
  id: string;
  question: string;
  category: string | null;
  deep_dive: string | null;
  deep_dive_youtube_url: string | null;
  deep_dive_blog_post_id: string | null;
  deep_dive_related_poll_ids: unknown;
};

const CATEGORY_FETCH_BUFFER = 32;

async function loadPollRefs(
  supabase: SupabaseClient,
  pollIds: string[]
): Promise<Array<{ id: string; question: string; category: string | null }>> {
  if (pollIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("polls")
    .select("id, question, category")
    .in("id", pollIds)
    .eq("is_published", true)
    .eq("is_hidden", false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    question: String(row.question),
    category: row.category ? String(row.category) : null
  }));
}

async function loadBlogPostCard(supabase: SupabaseClient, postId: string | null | undefined) {
  const id = (postId ?? "").trim();
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, featured_image_url, status, blog_topics!blog_posts_primary_topic_id_fkey(slug)"
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const topicRow = data.blog_topics as { slug?: string } | { slug?: string }[] | null;
  const topicSlug = Array.isArray(topicRow) ? topicRow[0]?.slug : topicRow?.slug;

  return buildDeepDiveBlogCard({
    id: String(data.id),
    title: String(data.title),
    slug: String(data.slug),
    featuredImageUrl: data.featured_image_url ? String(data.featured_image_url) : "",
    primaryTopic: topicSlug ? { slug: topicSlug } : null
  });
}

async function loadCategoryPeerPolls(
  supabase: SupabaseClient,
  poll: PollDeepDiveRow,
  excludeIds: Set<string>
) {
  const category = (poll.category ?? "").trim();
  if (!category) {
    return [];
  }

  const { data, error } = await supabase
    .from("polls")
    .select("id, question, category, order_index")
    .eq("is_published", true)
    .eq("is_hidden", false)
    .ilike("category", escapePollCategoryIlikeExact(category))
    .neq("id", poll.id)
    .order("order_index", { ascending: true })
    .limit(CATEGORY_FETCH_BUFFER + excludeIds.size);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => !excludeIds.has(String(row.id)))
    .slice(0, CATEGORY_FETCH_BUFFER)
    .map((row) => ({
      id: String(row.id),
      question: String(row.question),
      category: row.category ? String(row.category) : null
    }));
}

export async function loadPollDeepDiveContent(
  supabase: SupabaseClient,
  poll: PollDeepDiveRow,
  options?: { excludePollIds?: string[] }
): Promise<PollDeepDiveContent> {
  const extraExclude = options?.excludePollIds ?? [];
  const relatedIds = normalizeDeepDiveRelatedPollIds(poll.deep_dive_related_poll_ids);
  const excludeIds = new Set<string>([poll.id, ...relatedIds, ...extraExclude]);

  const [relatedPolls, blogPost, categoryPolls] = await Promise.all([
    loadPollRefs(supabase, relatedIds),
    loadBlogPostCard(supabase, poll.deep_dive_blog_post_id),
    loadCategoryPeerPolls(supabase, poll, excludeIds)
  ]);

  const relatedOrder = new Map(relatedIds.map((id, index) => [id, index]));
  const orderedRelated = [...relatedPolls].sort(
    (a, b) => (relatedOrder.get(a.id) ?? 0) - (relatedOrder.get(b.id) ?? 0)
  );

  const mergedRelated = mergeDeepDiveRelatedPolls(orderedRelated, categoryPolls, poll.id, extraExclude);

  return buildPollDeepDiveContent({
    youtubeUrl: poll.deep_dive_youtube_url,
    blogPost,
    mergedRelatedPolls: mergedRelated
  });
}
