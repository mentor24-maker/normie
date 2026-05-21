import {
  computeBlogReadingTimeMinutes,
  isBlogPostPubliclyVisible,
  rowToBlogCategory,
  rowToBlogPost,
  rowToBlogTag,
  rowToBlogTopic,
  slugifyBlogText,
  toBlogPostCard,
  type BlogCategoryRecord,
  type BlogPostCard,
  type BlogPostEditorInput,
  type BlogPostRecord,
  type BlogTagRecord,
  type BlogTopicRecord
} from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase-admin";
import { createPublicClient } from "@/lib/supabase-public";

const POST_SELECT = `
  id,
  title,
  slug,
  excerpt,
  body_html,
  featured_image_url,
  status,
  published_at,
  author_team_user_id,
  primary_topic_id,
  primary_category_id,
  meta_title,
  meta_description,
  og_title,
  og_description,
  og_image_url,
  twitter_card_type,
  canonical_url,
  noindex,
  reading_time_minutes,
  created_at,
  updated_at
`;

type SupabaseClient = ReturnType<typeof createAdminClient>;

async function loadPostRelations(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<
  Map<
    string,
    {
      topicIds: string[];
      categoryIds: string[];
      tagIds: string[];
      relatedPostIds: string[];
    }
  >
> {
  const map = new Map<
    string,
    { topicIds: string[]; categoryIds: string[]; tagIds: string[]; relatedPostIds: string[] }
  >();

  if (postIds.length === 0) {
    return map;
  }

  const [topicsRes, categoriesRes, tagsRes, relatedRes] = await Promise.all([
    supabase.from("blog_post_topics").select("post_id, topic_id").in("post_id", postIds),
    supabase.from("blog_post_categories").select("post_id, category_id").in("post_id", postIds),
    supabase.from("blog_post_tags").select("post_id, tag_id").in("post_id", postIds),
    supabase
      .from("blog_post_related_posts")
      .select("post_id, related_post_id, sort_order")
      .in("post_id", postIds)
      .order("sort_order", { ascending: true })
  ]);

  for (const postId of postIds) {
    map.set(postId, { topicIds: [], categoryIds: [], tagIds: [], relatedPostIds: [] });
  }

  for (const row of topicsRes.data ?? []) {
    const entry = map.get(row.post_id);

    if (entry) {
      entry.topicIds.push(row.topic_id);
    }
  }

  for (const row of categoriesRes.data ?? []) {
    const entry = map.get(row.post_id);

    if (entry) {
      entry.categoryIds.push(row.category_id);
    }
  }

  for (const row of tagsRes.data ?? []) {
    const entry = map.get(row.post_id);

    if (entry) {
      entry.tagIds.push(row.tag_id);
    }
  }

  for (const row of relatedRes.data ?? []) {
    const entry = map.get(row.post_id);

    if (entry) {
      entry.relatedPostIds.push(row.related_post_id);
    }
  }

  return map;
}

async function loadAuthorNames(supabase: SupabaseClient, authorIds: string[]) {
  const names = new Map<string, string>();

  if (authorIds.length === 0) {
    return names;
  }

  const { data } = await supabase.from("team_users").select("id, full_name").in("id", authorIds);

  for (const row of data ?? []) {
    names.set(row.id, row.full_name || "Normie");
  }

  return names;
}

function enrichPosts(
  rows: Record<string, unknown>[],
  relations: Map<
    string,
    { topicIds: string[]; categoryIds: string[]; tagIds: string[]; relatedPostIds: string[] }
  >,
  topicsById: Map<string, BlogTopicRecord>,
  categoriesById: Map<string, BlogCategoryRecord>,
  tagsById: Map<string, BlogTagRecord>,
  authorNames: Map<string, string>
): BlogPostRecord[] {
  return rows.map((row) => {
    const id = String(row.id);
    const rel = relations.get(id) ?? { topicIds: [], categoryIds: [], tagIds: [], relatedPostIds: [] };
    const topics = rel.topicIds.map((topicId) => topicsById.get(topicId)).filter(Boolean) as BlogTopicRecord[];
    const categories = rel.categoryIds
      .map((categoryId) => categoriesById.get(categoryId))
      .filter(Boolean) as BlogCategoryRecord[];
    const tags = rel.tagIds.map((tagId) => tagsById.get(tagId)).filter(Boolean) as BlogTagRecord[];
    const primaryTopicId = row.primary_topic_id ? String(row.primary_topic_id) : null;
    const primaryTopic = primaryTopicId ? topicsById.get(primaryTopicId) ?? topics.find((t) => t.id === primaryTopicId) ?? null : null;
    const primaryCategoryId = row.primary_category_id ? String(row.primary_category_id) : null;
    const primaryCategory = primaryCategoryId
      ? categoriesById.get(primaryCategoryId) ?? categories.find((c) => c.id === primaryCategoryId) ?? null
      : null;
    const authorId = row.author_team_user_id ? String(row.author_team_user_id) : null;

    return rowToBlogPost(row, {
      topicIds: rel.topicIds,
      categoryIds: rel.categoryIds,
      tagIds: rel.tagIds,
      relatedPostIds: rel.relatedPostIds,
      topics,
      categories,
      tags,
      primaryTopic,
      primaryCategory,
      authorName: authorId ? authorNames.get(authorId) ?? "Normie" : "Normie"
    });
  });
}

export async function listAdminBlogTopics() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blog_topics").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToBlogTopic(row));
}

export async function listAdminBlogCategories() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blog_categories").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToBlogCategory(row));
}

export async function listAdminBlogTags() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blog_tags").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToBlogTag(row));
}

export async function listAdminBlogPosts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const postIds = rows.map((row) => String(row.id));
  const relations = await loadPostRelations(supabase, postIds);
  const [topics, categories, tags] = await Promise.all([
    listAdminBlogTopics(),
    listAdminBlogCategories(),
    listAdminBlogTags()
  ]);
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const authorIds = rows
    .map((row) => (row.author_team_user_id ? String(row.author_team_user_id) : ""))
    .filter(Boolean);
  const authorNames = await loadAuthorNames(supabase, authorIds);

  return enrichPosts(rows, relations, topicsById, categoriesById, tagsById, authorNames);
}

export async function getAdminBlogPostById(postId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blog_posts").select(POST_SELECT).eq("id", postId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const rows = [data as Record<string, unknown>];
  const relations = await loadPostRelations(supabase, [postId]);
  const [topics, categories, tags] = await Promise.all([
    listAdminBlogTopics(),
    listAdminBlogCategories(),
    listAdminBlogTags()
  ]);
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const authorNames = await loadAuthorNames(
    supabase,
    data.author_team_user_id ? [String(data.author_team_user_id)] : []
  );

  return enrichPosts(rows, relations, topicsById, categoriesById, tagsById, authorNames)[0] ?? null;
}

async function syncPostRelations(supabase: SupabaseClient, postId: string, input: BlogPostEditorInput) {
  await supabase.from("blog_post_topics").delete().eq("post_id", postId);
  await supabase.from("blog_post_categories").delete().eq("post_id", postId);
  await supabase.from("blog_post_tags").delete().eq("post_id", postId);
  await supabase.from("blog_post_related_posts").delete().eq("post_id", postId);

  if (input.topicIds.length > 0) {
    const { error } = await supabase.from("blog_post_topics").insert(
      input.topicIds.map((topicId) => ({ post_id: postId, topic_id: topicId }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.categoryIds.length > 0) {
    const { error } = await supabase.from("blog_post_categories").insert(
      input.categoryIds.map((categoryId) => ({ post_id: postId, category_id: categoryId }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.tagIds.length > 0) {
    const { error } = await supabase.from("blog_post_tags").insert(
      input.tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.relatedPostIds.length > 0) {
    const { error } = await supabase.from("blog_post_related_posts").insert(
      input.relatedPostIds.map((relatedPostId, index) => ({
        post_id: postId,
        related_post_id: relatedPostId,
        sort_order: index
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function saveAdminBlogPost(input: BlogPostEditorInput, postId?: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const readingTimeMinutes = computeBlogReadingTimeMinutes(input.bodyHtml);
  const payload = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body_html: input.bodyHtml,
    featured_image_url: input.featuredImageUrl,
    status: input.status,
    published_at: input.publishedAt,
    author_team_user_id: input.authorTeamUserId,
    primary_topic_id: input.primaryTopicId,
    primary_category_id: input.primaryCategoryId,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
    og_title: input.ogTitle,
    og_description: input.ogDescription,
    og_image_url: input.ogImageUrl,
    twitter_card_type: input.twitterCardType,
    canonical_url: input.canonicalUrl,
    noindex: input.noindex,
    reading_time_minutes: readingTimeMinutes,
    updated_at: now
  };

  if (postId) {
    const { data, error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", postId)
      .select(POST_SELECT)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update post.");
    }

    await syncPostRelations(supabase, postId, input);
    return getAdminBlogPostById(postId);
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({ ...payload, created_at: now })
    .select(POST_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create post.");
  }

  const newId = String(data.id);
  await syncPostRelations(supabase, newId, input);
  return getAdminBlogPostById(newId);
}

export async function deleteAdminBlogPost(postId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveAdminBlogTopic(input: { id?: string; name: string; slug?: string }) {
  const supabase = createAdminClient();
  const name = input.name.trim();
  const slug = slugifyBlogText(input.slug || name, 120);
  const now = new Date().toISOString();

  if (!name || !slug) {
    throw new Error("Topic name is required.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("blog_topics")
      .update({ name, slug, updated_at: now })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update topic.");
    }

    return rowToBlogTopic(data);
  }

  const { data, error } = await supabase
    .from("blog_topics")
    .insert({ name, slug, updated_at: now })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create topic.");
  }

  return rowToBlogTopic(data);
}

export async function deleteAdminBlogTopic(topicId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_topics").delete().eq("id", topicId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveAdminBlogCategory(input: { id?: string; name: string; slug?: string }) {
  const supabase = createAdminClient();
  const name = input.name.trim();
  const slug = slugifyBlogText(input.slug || name, 120);
  const now = new Date().toISOString();

  if (!name || !slug) {
    throw new Error("Category name is required.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("blog_categories")
      .update({ name, slug, updated_at: now })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update category.");
    }

    return rowToBlogCategory(data);
  }

  const { data, error } = await supabase
    .from("blog_categories")
    .insert({ name, slug, updated_at: now })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create category.");
  }

  return rowToBlogCategory(data);
}

export async function deleteAdminBlogCategory(categoryId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_categories").delete().eq("id", categoryId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveAdminBlogTag(input: { id?: string; name: string; slug?: string }) {
  const supabase = createAdminClient();
  const name = input.name.trim();
  const slug = slugifyBlogText(input.slug || name, 120);
  const now = new Date().toISOString();

  if (!name || !slug) {
    throw new Error("Tag name is required.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("blog_tags")
      .update({ name, slug, updated_at: now })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update tag.");
    }

    return rowToBlogTag(data);
  }

  const { data, error } = await supabase
    .from("blog_tags")
    .insert({ name, slug, updated_at: now })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create tag.");
  }

  return rowToBlogTag(data);
}

export async function deleteAdminBlogTag(tagId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_tags").delete().eq("id", tagId);

  if (error) {
    throw new Error(error.message);
  }
}

export type PublicBlogListOptions = {
  limit: number;
  offset: number;
  topicSlug?: string;
  categorySlug?: string;
  tagSlug?: string;
  searchQuery?: string;
};

export async function listPublicBlogPosts(options: PublicBlogListOptions) {
  try {
    return await listPublicBlogPostsInternal(options);
  } catch {
    return { posts: [], total: 0 };
  }
}

async function listPublicBlogPostsInternal(options: PublicBlogListOptions) {
  const supabase = createPublicClient();
  let postIdsFilter: string[] | null = null;

  if (options.topicSlug) {
    const { data: topic } = await supabase.from("blog_topics").select("id").eq("slug", options.topicSlug).maybeSingle();

    if (!topic) {
      return { posts: [], total: 0 };
    }

    const { data: links } = await supabase.from("blog_post_topics").select("post_id").eq("topic_id", topic.id);
    postIdsFilter = (links ?? []).map((row) => row.post_id);

    if (postIdsFilter.length === 0) {
      return { posts: [], total: 0 };
    }
  }

  if (options.categorySlug) {
    const { data: category } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", options.categorySlug)
      .maybeSingle();

    if (!category) {
      return { posts: [], total: 0 };
    }

    const { data: links } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("category_id", category.id);
    const categoryPostIds = (links ?? []).map((row) => row.post_id);

    if (categoryPostIds.length === 0) {
      return { posts: [], total: 0 };
    }

    postIdsFilter = postIdsFilter
      ? postIdsFilter.filter((id) => categoryPostIds.includes(id))
      : categoryPostIds;

    if (postIdsFilter.length === 0) {
      return { posts: [], total: 0 };
    }
  }

  if (options.tagSlug) {
    const { data: tag } = await supabase.from("blog_tags").select("id").eq("slug", options.tagSlug).maybeSingle();

    if (!tag) {
      return { posts: [], total: 0 };
    }

    const { data: links } = await supabase.from("blog_post_tags").select("post_id").eq("tag_id", tag.id);
    const tagPostIds = (links ?? []).map((row) => row.post_id);

    if (tagPostIds.length === 0) {
      return { posts: [], total: 0 };
    }

    postIdsFilter = postIdsFilter ? postIdsFilter.filter((id) => tagPostIds.includes(id)) : tagPostIds;

    if (postIdsFilter.length === 0) {
      return { posts: [], total: 0 };
    }
  }

  let query = supabase
    .from("blog_posts")
    .select(POST_SELECT, { count: "exact" })
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (postIdsFilter) {
    query = query.in("id", postIdsFilter);
  }

  if (options.searchQuery?.trim()) {
    const escapedSearch = options.searchQuery.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = query.or(`title.ilike.%${escapedSearch}%,excerpt.ilike.%${escapedSearch}%`);
  }

  const { data, error, count } = await query.range(options.offset, options.offset + options.limit - 1);

  if (error) {
    return { posts: [], total: 0 };
  }

  const rows = (data ?? []).filter((row) => isBlogPostPubliclyVisible(row)) as Record<string, unknown>[];

  if (rows.length === 0) {
    return { posts: [], total: count ?? 0 };
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return { posts: [], total: count ?? 0 };
  }
  const postIds = rows.map((row) => String(row.id));
  const relations = await loadPostRelations(admin, postIds);
  const [topics, categories, tags] = await Promise.all([
    listAdminBlogTopics(),
    listAdminBlogCategories(),
    listAdminBlogTags()
  ]);
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const authorNames = await loadAuthorNames(
    admin,
    rows.map((row) => (row.author_team_user_id ? String(row.author_team_user_id) : "")).filter(Boolean)
  );

  const posts = enrichPosts(rows, relations, topicsById, categoriesById, tagsById, authorNames).map(toBlogPostCard);

  return { posts, total: count ?? posts.length };
}

async function getPublicPostIdsLinkedToTaxonomy(
  table: "blog_post_tags" | "blog_post_topics" | "blog_post_categories",
  foreignKey: "tag_id" | "topic_id" | "category_id",
  ids: string[],
  excludePostId: string
) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.from(table).select("post_id").in(foreignKey, ids);

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const postIds: string[] = [];

  for (const row of data ?? []) {
    const postId = String(row.post_id);

    if (postId === excludePostId || seen.has(postId)) {
      continue;
    }

    seen.add(postId);
    postIds.push(postId);
  }

  return postIds;
}

async function fetchPublicBlogCardsForPostIds(postIds: string[], limit: number) {
  if (postIds.length === 0 || limit <= 0) {
    return [];
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .in("id", postIds)
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter((row) => isBlogPostPubliclyVisible(row)) as Record<string, unknown>[];

  if (rows.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const ids = rows.map((row) => String(row.id));
  const relations = await loadPostRelations(admin, ids);
  const [topics, categories, tags] = await Promise.all([
    listAdminBlogTopics(),
    listAdminBlogCategories(),
    listAdminBlogTags()
  ]);
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const authorNames = await loadAuthorNames(
    admin,
    rows.map((row) => (row.author_team_user_id ? String(row.author_team_user_id) : "")).filter(Boolean)
  );

  return enrichPosts(rows, relations, topicsById, categoriesById, tagsById, authorNames).map(toBlogPostCard);
}

export async function listPublicBlogSidebarRelatedPosts(
  post: Pick<BlogPostRecord, "id" | "tagIds" | "topicIds" | "categoryIds" | "primaryTopicId" | "primaryCategoryId">,
  limit = 3
) {
  const results: BlogPostCard[] = [];
  const seen = new Set<string>([post.id]);

  async function appendFromTaxonomy(
    table: "blog_post_tags" | "blog_post_topics" | "blog_post_categories",
    foreignKey: "tag_id" | "topic_id" | "category_id",
    ids: string[]
  ) {
    const remaining = limit - results.length;

    if (remaining <= 0 || ids.length === 0) {
      return;
    }

    const candidateIds = await getPublicPostIdsLinkedToTaxonomy(table, foreignKey, ids, post.id);
    const freshIds = candidateIds.filter((id) => !seen.has(id));

    if (freshIds.length === 0) {
      return;
    }

    const cards = await fetchPublicBlogCardsForPostIds(freshIds, remaining);

    for (const card of cards) {
      if (results.length >= limit || seen.has(card.id)) {
        continue;
      }

      seen.add(card.id);
      results.push(card);
    }
  }

  await appendFromTaxonomy("blog_post_tags", "tag_id", post.tagIds);

  const topicIds = [
    ...new Set(
      [...post.topicIds, post.primaryTopicId ? post.primaryTopicId : ""].filter(Boolean)
    )
  ];
  await appendFromTaxonomy("blog_post_topics", "topic_id", topicIds);

  const categoryIds = [
    ...new Set(
      [...post.categoryIds, post.primaryCategoryId ? post.primaryCategoryId : ""].filter(Boolean)
    )
  ];
  await appendFromTaxonomy("blog_post_categories", "category_id", categoryIds);

  return results.slice(0, limit);
}

export async function getPublicBlogPost(topicSlug: string, postSlug: string) {
  const supabase = createPublicClient();
  const { data: topic } = await supabase.from("blog_topics").select("*").eq("slug", topicSlug).maybeSingle();

  if (!topic) {
    return null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select(POST_SELECT)
    .eq("slug", postSlug)
    .eq("primary_topic_id", topic.id)
    .maybeSingle();

  if (error || !data || !isBlogPostPubliclyVisible(data)) {
    return null;
  }

  const post = await getAdminBlogPostById(String(data.id));

  if (!post) {
    return null;
  }

  const related: BlogPostRecord[] = [];

  for (const relatedId of post.relatedPostIds) {
    const relatedPost = await getAdminBlogPostById(relatedId);

    if (relatedPost && isBlogPostPubliclyVisible({ status: relatedPost.status, published_at: relatedPost.publishedAt })) {
      related.push(relatedPost);
    }
  }

  return { post, related: related.map(toBlogPostCard) };
}

export async function listPublicBlogTopicsAndTags() {
  try {
    const supabase = createPublicClient();
    const [topicsRes, categoriesRes, tagsRes] = await Promise.all([
      supabase.from("blog_topics").select("*").order("name", { ascending: true }),
      supabase.from("blog_categories").select("*").order("name", { ascending: true }),
      supabase.from("blog_tags").select("*").order("name", { ascending: true })
    ]);

    return {
      topics: (topicsRes.data ?? []).map((row) => rowToBlogTopic(row)),
      categories: (categoriesRes.data ?? []).map((row) => rowToBlogCategory(row)),
      tags: (tagsRes.data ?? []).map((row) => rowToBlogTag(row))
    };
  } catch {
    return { topics: [], categories: [], tags: [] };
  }
}

export async function listPublicBlogPostPaths() {
  const supabase = createPublicClient();
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, published_at, status, primary_topic_id")
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const visiblePosts = (posts ?? []).filter((row) => isBlogPostPubliclyVisible(row));
  const topicIds = [
    ...new Set(
      visiblePosts
        .map((row) => (row.primary_topic_id ? String(row.primary_topic_id) : ""))
        .filter(Boolean)
    )
  ];

  if (topicIds.length === 0) {
    return [];
  }

  const { data: topics } = await supabase.from("blog_topics").select("id, slug").in("id", topicIds);
  const topicSlugById = new Map((topics ?? []).map((topic) => [String(topic.id), String(topic.slug)]));

  return visiblePosts
    .map((row) => ({
      topicSlug: row.primary_topic_id ? topicSlugById.get(String(row.primary_topic_id)) ?? "" : "",
      postSlug: String(row.slug)
    }))
    .filter((entry) => entry.topicSlug && entry.postSlug);
}
