"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BlogCategoryRecord,
  BlogPostEditorInput,
  BlogPostRecord,
  BlogTagRecord,
  BlogTopicRecord
} from "@/lib/blog";
import { getBlogPostPath, normalizeBlogSlugInput, slugifyBlogText } from "@/lib/blog";
import { AdminBlogPostEditor } from "@/components/admin-blog-post-editor";
import { AdminBlogTaxonomyList } from "@/components/admin-blog-taxonomy-list";

type BlogView = "posts" | "topics" | "categories" | "tags";

type TeamAuthor = {
  id: string;
  fullName: string;
};

function createEmptyDraft(): BlogPostEditorInput & { id?: string } {
  return {
    title: "",
    slug: "",
    excerpt: "",
    bodyHtml: "",
    featuredImageUrl: "",
    status: "draft",
    publishedAt: null,
    authorTeamUserId: null,
    primaryTopicId: null,
    primaryCategoryId: null,
    topicIds: [],
    categoryIds: [],
    tagIds: [],
    relatedPostIds: [],
    metaTitle: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    twitterCardType: "summary_large_image",
    canonicalUrl: "",
    noindex: false
  };
}

function postToDraft(post: BlogPostRecord): BlogPostEditorInput & { id: string } {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    featuredImageUrl: post.featuredImageUrl,
    status: post.status,
    publishedAt: post.publishedAt,
    authorTeamUserId: post.authorTeamUserId,
    primaryTopicId: post.primaryTopicId,
    primaryCategoryId: post.primaryCategoryId,
    topicIds: post.topicIds,
    categoryIds: post.categoryIds,
    tagIds: post.tagIds,
    relatedPostIds: post.relatedPostIds,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    ogImageUrl: post.ogImageUrl,
    twitterCardType: post.twitterCardType,
    canonicalUrl: post.canonicalUrl,
    noindex: post.noindex
  };
}

export function AdminBlogWorkspace() {
  const [view, setView] = useState<BlogView>("posts");
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [topics, setTopics] = useState<BlogTopicRecord[]>([]);
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [tags, setTags] = useState<BlogTagRecord[]>([]);
  const [authors, setAuthors] = useState<TeamAuthor[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [editingDraft, setEditingDraft] = useState<(BlogPostEditorInput & { id?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [topicDraft, setTopicDraft] = useState({ name: "", slug: "" });
  const [categoryDraft, setCategoryDraft] = useState({ name: "", slug: "" });
  const [tagDraft, setTagDraft] = useState({ name: "", slug: "" });

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [postsRes, topicsRes, categoriesRes, tagsRes, teamRes, sessionRes] = await Promise.all([
        fetch("/api/admin/blog/posts", { cache: "no-store" }),
        fetch("/api/admin/blog/topics", { cache: "no-store" }),
        fetch("/api/admin/blog/categories", { cache: "no-store" }),
        fetch("/api/admin/blog/tags", { cache: "no-store" }),
        fetch("/api/admin/team", { cache: "no-store" }),
        fetch("/api/admin/session", { cache: "no-store" })
      ]);

      const postsPayload = (await postsRes.json()) as { posts?: BlogPostRecord[]; error?: string };
      const topicsPayload = (await topicsRes.json()) as { topics?: BlogTopicRecord[]; error?: string };
      const categoriesPayload = (await categoriesRes.json()) as {
        categories?: BlogCategoryRecord[];
        error?: string;
      };
      const tagsPayload = (await tagsRes.json()) as { tags?: BlogTagRecord[]; error?: string };
      const teamPayload = (await teamRes.json()) as {
        users?: Array<{ id: string; fullName?: string; full_name?: string }>;
      };
      const sessionPayload = (await sessionRes.json()) as { user?: { role?: string } };

      if (!postsRes.ok) {
        throw new Error(postsPayload.error ?? "Failed to load posts.");
      }

      setPosts(postsPayload.posts ?? []);
      setTopics(topicsPayload.topics ?? []);
      setCategories(categoriesPayload.categories ?? []);
      setTags(tagsPayload.tags ?? []);
      setAuthors(
        (teamPayload.users ?? []).map((user) => ({
          id: user.id,
          fullName: user.fullName ?? user.full_name ?? "Team member"
        }))
      );
      const role = sessionPayload.user?.role ?? "";
      setCanPublish(role === "admin" || role === "owner");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load blog data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function savePost() {
    if (!editingDraft) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingDraft.id ? `/api/admin/blog/posts/${editingDraft.id}` : "/api/admin/blog/posts",
        {
          method: editingDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingDraft)
        }
      );
      const payload = (await response.json()) as { post?: BlogPostRecord; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save post.");
      }

      setMessage("Post saved.");
      setEditingDraft(null);
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save post.");
    } finally {
      setIsSaving(false);
    }
  }

  function getPostViewUrl(post: BlogPostRecord) {
    if (!post.primaryTopic?.slug) {
      return null;
    }

    return getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic });
  }

  async function publishPost(post: BlogPostRecord) {
    if (!canPublish) {
      return;
    }

    if (!window.confirm(`Publish "${post.title}"?`)) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const draft = postToDraft(post);
      const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          status: "published",
          publishedAt: draft.publishedAt ?? new Date().toISOString()
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to publish post.");
      }

      setMessage(`"${post.title}" is published.`);
      await loadAll();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish post.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePost(postId: string) {
    if (!window.confirm("Delete this post?")) {
      return;
    }

    const response = await fetch(`/api/admin/blog/posts/${postId}`, { method: "DELETE" });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to delete post.");
      return;
    }

    setMessage("Post deleted.");
    await loadAll();
  }

  async function saveTopic() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/blog/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicDraft)
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save topic.");
      }

      setTopicDraft({ name: "", slug: "" });
      setMessage("Topic saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save topic.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCategory() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryDraft)
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save category.");
      }

      setCategoryDraft({ name: "", slug: "" });
      setMessage("Category saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTag() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagDraft)
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save tag.");
      }

      setTagDraft({ name: "", slug: "" });
      setMessage("Tag saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save tag.");
    } finally {
      setIsSaving(false);
    }
  }

  if (editingDraft) {
    return (
      <AdminBlogPostEditor
        authors={authors}
        canPublish={canPublish}
        draft={editingDraft}
        isSaving={isSaving}
        onCancel={() => setEditingDraft(null)}
        onChange={setEditingDraft}
        onSave={() => void savePost()}
        categories={categories}
        posts={posts}
        tags={tags}
        topics={topics}
      />
    );
  }

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <h2 className="admin-section-heading">Blog</h2>
            <p className="page-copy admin-copy">Manage posts, topics, categories, and tags for the public blog at /blog.</p>
          </div>
          <div className="admin-actions">
            {view === "posts" ? (
              <button className="submit-button" onClick={() => setEditingDraft(createEmptyDraft())} type="button">
                New post
              </button>
            ) : null}
          </div>
        </div>
        <div className="admin-blog-view-tabs">
          {(["posts", "topics", "categories", "tags"] as BlogView[]).map((tab) => (
            <button
              className={`secondary-button${view === tab ? " is-active" : ""}`}
              key={tab}
              onClick={() => setView(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}
      </section>

      {view === "posts" ? (
        <section className="admin-section">
          <div className="table-shell">
            <table className="polls-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Primary topic</th>
                  <th>Primary category</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const viewUrl = getPostViewUrl(post);

                  return (
                    <tr key={post.id}>
                      <td><strong>{post.title}</strong></td>
                      <td>{post.status}</td>
                      <td>{post.primaryTopic?.name ?? "—"}</td>
                      <td>{post.primaryCategory?.name ?? "—"}</td>
                      <td>{new Date(post.updatedAt).toLocaleString()}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="polls-icon-button"
                            onClick={() => setEditingDraft(postToDraft(post))}
                            type="button"
                            aria-label="Edit post"
                            title="Edit"
                          >
                            ✎
                          </button>
                          {viewUrl ? (
                            <a
                              className="polls-icon-button"
                              href={viewUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                              aria-label="View post"
                              title="View post"
                            >
                              ↗
                            </a>
                          ) : (
                            <button
                              className="polls-icon-button"
                              disabled
                              type="button"
                              aria-label="View post (set primary topic)"
                              title="Set a primary topic to view"
                            >
                              ↗
                            </button>
                          )}
                          {canPublish && post.status !== "published" ? (
                            <button
                              className="polls-icon-button polls-icon-button-success"
                              disabled={isSaving}
                              onClick={() => void publishPost(post)}
                              type="button"
                              aria-label="Publish post"
                              title="Publish"
                            >
                              ↑
                            </button>
                          ) : null}
                          <button
                            className="polls-icon-button polls-icon-button-danger"
                            onClick={() => void deletePost(post.id)}
                            type="button"
                            aria-label="Delete post"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && posts.length === 0 ? (
                  <tr>
                    <td className="empty-cell" colSpan={6}>
                      No posts yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "topics" ? (
        <section className="admin-section admin-blog-taxonomy-panel">
          <div className="admin-form-grid">
            <label className="field">
              <span>Name</span>
              <input
                value={topicDraft.name}
                onChange={(event) =>
                  setTopicDraft({
                    name: event.target.value,
                    slug: slugifyBlogText(event.target.value)
                  })
                }
              />
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                value={topicDraft.slug}
                onChange={(event) => setTopicDraft({ ...topicDraft, slug: normalizeBlogSlugInput(event.target.value) })}
              />
            </label>
          </div>
          <button
            className="submit-button admin-blog-add-button"
            disabled={isSaving}
            onClick={() => void saveTopic()}
            type="button"
          >
            Add topic
          </button>
          <AdminBlogTaxonomyList
            disabled={isSaving}
            items={topics}
            label="topic"
            onChanged={loadAll}
            onError={setError}
            onMessage={setMessage}
            resource="topics"
          />
        </section>
      ) : null}

      {view === "categories" ? (
        <section className="admin-section admin-blog-taxonomy-panel">
          <div className="admin-form-grid">
            <label className="field">
              <span>Name</span>
              <input
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft({
                    name: event.target.value,
                    slug: slugifyBlogText(event.target.value)
                  })
                }
              />
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                value={categoryDraft.slug}
                onChange={(event) =>
                  setCategoryDraft({ ...categoryDraft, slug: normalizeBlogSlugInput(event.target.value) })
                }
              />
            </label>
          </div>
          <button
            className="submit-button admin-blog-add-button"
            disabled={isSaving}
            onClick={() => void saveCategory()}
            type="button"
          >
            Add category
          </button>
          <AdminBlogTaxonomyList
            disabled={isSaving}
            items={categories}
            label="category"
            onChanged={loadAll}
            onError={setError}
            onMessage={setMessage}
            resource="categories"
          />
        </section>
      ) : null}

      {view === "tags" ? (
        <section className="admin-section admin-blog-taxonomy-panel">
          <div className="admin-form-grid">
            <label className="field">
              <span>Name</span>
              <input
                value={tagDraft.name}
                onChange={(event) =>
                  setTagDraft({
                    name: event.target.value,
                    slug: slugifyBlogText(event.target.value)
                  })
                }
              />
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                value={tagDraft.slug}
                onChange={(event) => setTagDraft({ ...tagDraft, slug: normalizeBlogSlugInput(event.target.value) })}
              />
            </label>
          </div>
          <button
            className="submit-button admin-blog-add-button"
            disabled={isSaving}
            onClick={() => void saveTag()}
            type="button"
          >
            Add tag
          </button>
          <AdminBlogTaxonomyList
            columns={3}
            disabled={isSaving}
            items={tags}
            label="tag"
            onChanged={loadAll}
            onError={setError}
            onMessage={setMessage}
            resource="tags"
          />
        </section>
      ) : null}
    </section>
  );
}
