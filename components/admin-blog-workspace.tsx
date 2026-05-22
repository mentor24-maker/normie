"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import type {
  BlogCategoryRecord,
  BlogPostEditorInput,
  BlogPostRecord,
  BlogTagRecord,
  BlogTopicRecord
} from "@/lib/blog";
import { getBlogPostPath, normalizeBlogSlugInput, slugifyBlogText } from "@/lib/blog";
import { DEFAULT_BLOG_SETTINGS, type BlogSettingsSnapshot } from "@/lib/blog-settings";
import { parseAdminJsonResponse, readAdminJson } from "@/lib/admin-fetch";
import { AdminBlogPostEditor } from "@/components/admin-blog-post-editor";
import { AdminBlogTaxonomyList } from "@/components/admin-blog-taxonomy-list";
import { BuilderGalleryModal } from "@/components/builder/builder-gallery-modal";
import { BuilderInlineNumberSelect } from "@/components/builder/builder-inline-number-select";

type BlogView = "posts" | "topics" | "categories" | "tags" | "settings";

type TeamAuthor = {
  id: string;
  fullName: string;
};

type BlogSettingsKey = keyof BlogSettingsSnapshot;
type BlogPaintMode = "color" | "gradient";

type BlogPaintDraft = {
  mode: BlogPaintMode;
  color1: string;
  color2: string;
  opacity: string;
};

type BlogPaintTarget = {
  label: string;
  modeKey?: BlogSettingsKey;
  colorKey: BlogSettingsKey;
  gradientKey?: BlogSettingsKey;
};

type BlogImageTarget = {
  modeKey: BlogSettingsKey;
  imageKey: BlogSettingsKey;
};

const DEFAULT_PAINT_DRAFT: BlogPaintDraft = {
  mode: "color",
  color1: "#ffffff",
  color2: "#f6fbff",
  opacity: "100"
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return null;
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function parsePaintValue(value: string, fallback = DEFAULT_PAINT_DRAFT): BlogPaintDraft {
  const text = value.trim();
  const gradientMatch = text.match(/gradient\([^#]*(#[0-9a-f]{3,6}|rgba?\([^)]+\)).*(#[0-9a-f]{3,6}|rgba?\([^)]+\))/i);

  if (gradientMatch) {
    return {
      ...fallback,
      mode: "gradient",
      color1: paintColorToHex(gradientMatch[1]),
      color2: paintColorToHex(gradientMatch[2]),
      opacity: paintColorToOpacity(gradientMatch[1])
    };
  }

  return {
    ...fallback,
    mode: "color",
    color1: paintColorToHex(text),
    opacity: paintColorToOpacity(text)
  };
}

function paintColorToHex(value: string) {
  const rgbaMatch = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);

  if (rgbaMatch) {
    return rgbToHex(Number(rgbaMatch[1]), Number(rgbaMatch[2]), Number(rgbaMatch[3]));
  }

  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : DEFAULT_PAINT_DRAFT.color1;
  }

  return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_PAINT_DRAFT.color1;
}

function paintColorToOpacity(value: string) {
  const rgbaMatch = value.match(/rgba\(\s*\d+[,\s]+\d+[,\s]+\d+[,\s]+([0-9.]+)/i);

  if (!rgbaMatch) {
    return "100";
  }

  return String(Math.round(Math.min(1, Math.max(0, Number.parseFloat(rgbaMatch[1]))) * 100));
}

function paintColorValue(hex: string, opacity: string) {
  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 };
  const alpha = Math.min(100, Math.max(0, Number.parseInt(opacity, 10) || 0)) / 100;

  return alpha >= 1 ? rgbToHex(rgb.r, rgb.g, rgb.b) : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
}

function paintGradientValue(draft: BlogPaintDraft) {
  return `linear-gradient(135deg, ${paintColorValue(draft.color1, draft.opacity)} 0%, ${paintColorValue(draft.color2, draft.opacity)} 100%)`;
}

function buildPaintValue(draft: BlogPaintDraft) {
  return draft.mode === "gradient" ? paintGradientValue(draft) : paintColorValue(draft.color1, draft.opacity);
}

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
  const [blogSettings, setBlogSettings] = useState<BlogSettingsSnapshot>(DEFAULT_BLOG_SETTINGS);
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [editingDraft, setEditingDraft] = useState<(BlogPostEditorInput & { id?: string }) | null>(null);
  const [paintTarget, setPaintTarget] = useState<BlogPaintTarget | null>(null);
  const [paintDraft, setPaintDraft] = useState<BlogPaintDraft>(DEFAULT_PAINT_DRAFT);
  const [galleryTarget, setGalleryTarget] = useState<BlogImageTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [topicDraft, setTopicDraft] = useState({ name: "", slug: "" });
  const [categoryDraft, setCategoryDraft] = useState({ name: "", slug: "" });
  const [tagDraft, setTagDraft] = useState({ name: "", slug: "" });

  function updateBlogSetting<Key extends keyof BlogSettingsSnapshot>(
    key: Key,
    value: BlogSettingsSnapshot[Key]
  ) {
    setBlogSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  const loadMedia = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const payload = await readAdminJson<{ media?: AdminMediaItem[]; error?: string }>(
        response,
        "Failed to load media gallery."
      );

      setGalleryMedia(payload.media ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load media gallery.");
    }
  }, []);

  function openPaintSelector(target: BlogPaintTarget) {
    const mode = target.modeKey ? blogSettings[target.modeKey] : "color";
    const fallback = parsePaintValue(String(blogSettings[target.colorKey] ?? ""));
    const nextDraft =
      mode === "gradient" && target.gradientKey
        ? parsePaintValue(String(blogSettings[target.gradientKey] ?? ""), { ...fallback, mode: "gradient" })
        : fallback;

    setPaintTarget(target);
    setPaintDraft(nextDraft);
  }

  function updatePaintDraft(nextDraft: BlogPaintDraft) {
    setPaintDraft(nextDraft);

    if (!paintTarget) {
      return;
    }

    if (paintTarget.modeKey) {
      updateBlogSetting(paintTarget.modeKey, nextDraft.mode as BlogSettingsSnapshot[typeof paintTarget.modeKey]);
    }

    if (nextDraft.mode === "gradient" && paintTarget.gradientKey) {
      updateBlogSetting(paintTarget.gradientKey, paintGradientValue(nextDraft) as BlogSettingsSnapshot[typeof paintTarget.gradientKey]);
    } else {
      updateBlogSetting(paintTarget.colorKey, buildPaintValue(nextDraft) as BlogSettingsSnapshot[typeof paintTarget.colorKey]);
    }
  }

  function openImageSelector(target: BlogImageTarget) {
    setGalleryTarget(target);
    setIsGalleryOpen(true);
    void loadMedia();
  }

  function selectGalleryImage(imagePath: string) {
    if (!galleryTarget) {
      return;
    }

    updateBlogSetting(galleryTarget.modeKey, "image" as BlogSettingsSnapshot[typeof galleryTarget.modeKey]);
    updateBlogSetting(galleryTarget.imageKey, imagePath as BlogSettingsSnapshot[typeof galleryTarget.imageKey]);
    setIsGalleryOpen(false);
    setGalleryTarget(null);
  }

  async function uploadMedia(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadingMedia(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const payload = await readAdminJson<{ media?: AdminMediaItem; error?: string }>(
        response,
        "Failed to upload media."
      );

      if (!payload.media) {
        throw new Error(payload.error ?? "Failed to upload media.");
      }

      setGalleryMedia((current) =>
        [...current.filter((item) => item.path !== payload.media!.path), payload.media!].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      selectGalleryImage(payload.media.path);
      setMessage(`Uploaded ${payload.media.name} to gallery.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media.");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const payload = await readAdminJson<{
        posts?: BlogPostRecord[];
        topics?: BlogTopicRecord[];
        categories?: BlogCategoryRecord[];
        tags?: BlogTagRecord[];
        settings?: BlogSettingsSnapshot;
        users?: Array<{ id: string; fullName?: string; full_name?: string }>;
        user?: { role?: string };
        error?: string;
      }>(await fetch("/api/admin/blog/bootstrap", { cache: "no-store" }), "Failed to load blog data.");

      setPosts(payload.posts ?? []);
      setTopics(payload.topics ?? []);
      setCategories(payload.categories ?? []);
      setTags(payload.tags ?? []);
      setBlogSettings(payload.settings ?? DEFAULT_BLOG_SETTINGS);
      setAuthors(
        (payload.users ?? []).map((user) => ({
          id: user.id,
          fullName: user.fullName ?? user.full_name ?? "Team member"
        }))
      );
      const role = payload.user?.role ?? "";
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
      await readAdminJson<{ post?: BlogPostRecord; error?: string }>(response, "Failed to save post.");

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
      await readAdminJson<{ error?: string }>(response, "Failed to publish post.");

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
      try {
        const payload = await parseAdminJsonResponse<{ error?: string }>(response, "Failed to delete post.");
        setError(payload.error ?? "Failed to delete post.");
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete post.");
      }
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
      await readAdminJson<{ error?: string }>(response, "Failed to save topic.");

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
      await readAdminJson<{ error?: string }>(response, "Failed to save category.");

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
      await readAdminJson<{ error?: string }>(response, "Failed to save tag.");

      setTagDraft({ name: "", slug: "" });
      setMessage("Tag saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save tag.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveBlogSettings() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/blog/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blogSettings)
      });
      const payload = await readAdminJson<{
        settings?: BlogSettingsSnapshot;
        error?: string;
      }>(response, "Failed to save blog settings.");

      setBlogSettings(payload.settings ?? blogSettings);
      setMessage("Blog settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save blog settings.");
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
            <button
              className={`secondary-button${view === "settings" ? " is-active" : ""}`}
              onClick={() => setView("settings")}
              type="button"
            >
              Settings
            </button>
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
                  <th className="crud-actions-cell">Actions</th>
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
                      <td className="crud-actions-cell">
                        <div className="table-actions">
                          <button
                            className="polls-icon-button polls-icon-button-edit"
                            onClick={() => setEditingDraft(postToDraft(post))}
                            type="button"
                            aria-label="Edit post"
                            title="Edit"
                          >
                            ✎
                          </button>
                          {viewUrl ? (
                            <a
                              className="polls-icon-button polls-icon-button-view"
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
                              className="polls-icon-button polls-icon-button-view"
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

      {view === "settings" ? (
        <section className="admin-section admin-blog-settings-panel">
          <div className="admin-blog-settings-metrics">
            <label className="field admin-blog-compact-field">
              <span>Article width</span>
              <input
                min="320"
                max="1400"
                type="number"
                value={blogSettings.articlePodWidth}
                onChange={(event) => updateBlogSetting("articlePodWidth", event.target.value)}
              />
            </label>
            <label className="field admin-blog-compact-field">
              <span>Sidebar width</span>
              <input
                min="220"
                max="520"
                type="number"
                value={blogSettings.sidebarWidth}
                onChange={(event) => updateBlogSetting("sidebarWidth", event.target.value)}
              />
            </label>
            <label className="field admin-blog-compact-field">
              <span>Sidebar Margin</span>
              <input
                min="0"
                max="120"
                type="number"
                value={blogSettings.horizontalMargin}
                onChange={(event) => updateBlogSetting("horizontalMargin", event.target.value)}
              />
            </label>
            <label className="field admin-blog-compact-field">
              <span>V margin</span>
              <input
                min="0"
                max="120"
                type="number"
                value={blogSettings.verticalMargin}
                onChange={(event) => updateBlogSetting("verticalMargin", event.target.value)}
              />
            </label>
            <label className="field admin-blog-compact-field">
              <span>Pod radius</span>
              <input
                min="0"
                max="80"
                type="number"
                value={blogSettings.podRadius}
                onChange={(event) => updateBlogSetting("podRadius", event.target.value)}
              />
            </label>
          </div>

          <div className="admin-blog-settings-columns">
            <section className="admin-blog-settings-group">
              <h3>Article pods</h3>
              <div className="admin-blog-pod-settings-row">
                <label className="field admin-blog-compact-field">
                  <span>Border</span>
                  <input
                    min="0"
                    max="12"
                    type="number"
                    value={blogSettings.articlePodBorderWidth}
                    onChange={(event) => updateBlogSetting("articlePodBorderWidth", event.target.value)}
                  />
                </label>
                <div className="field admin-blog-paint-field">
                  <span>Border color</span>
                  <button
                    className="admin-blog-rainbow-button"
                    onClick={() =>
                      openPaintSelector({
                        label: "Article border",
                        colorKey: "articlePodBorderColor"
                      })
                    }
                    style={{ background: blogSettings.articlePodBorderColor }}
                    title="Choose article border color"
                    type="button"
                  >
                    <span aria-hidden="true">◒</span>
                  </button>
                </div>
                <label className="field admin-blog-compact-field">
                  <span>Fill</span>
                  <select
                    value={blogSettings.articlePodBackgroundMode}
                    onChange={(event) =>
                      updateBlogSetting(
                        "articlePodBackgroundMode",
                        event.target.value as BlogSettingsSnapshot["articlePodBackgroundMode"]
                      )
                    }
                  >
                    <option value="color">Color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Image</option>
                  </select>
                </label>
                <div className="field admin-blog-paint-field">
                  <span>Paint</span>
                  <button
                    className="admin-blog-rainbow-button"
                    onClick={() =>
                      openPaintSelector({
                        label: "Article background",
                        modeKey: "articlePodBackgroundMode",
                        colorKey: "articlePodBackgroundColor",
                        gradientKey: "articlePodBackgroundGradient"
                      })
                    }
                    style={{
                      background:
                        blogSettings.articlePodBackgroundMode === "gradient"
                          ? blogSettings.articlePodBackgroundGradient
                          : blogSettings.articlePodBackgroundColor
                    }}
                    title="Choose article background"
                    type="button"
                  >
                    <span aria-hidden="true">◒</span>
                  </button>
                </div>
                <div className="field admin-blog-image-field">
                  <span>Image</span>
                  <button
                    className="secondary-button admin-blog-mini-button"
                    onClick={() =>
                      openImageSelector({
                        modeKey: "articlePodBackgroundMode",
                        imageKey: "articlePodBackgroundImage"
                      })
                    }
                    type="button"
                  >
                    Select
                  </button>
                </div>
              </div>
            </section>

            <section className="admin-blog-settings-group">
              <h3>Sidebar pod</h3>
              <div className="admin-blog-pod-settings-row">
                <label className="field admin-blog-compact-field">
                  <span>Border</span>
                  <input
                    min="0"
                    max="12"
                    type="number"
                    value={blogSettings.sidebarPodBorderWidth}
                    onChange={(event) => updateBlogSetting("sidebarPodBorderWidth", event.target.value)}
                  />
                </label>
                <div className="field admin-blog-paint-field">
                  <span>Border color</span>
                  <button
                    className="admin-blog-rainbow-button"
                    onClick={() =>
                      openPaintSelector({
                        label: "Sidebar border",
                        colorKey: "sidebarPodBorderColor"
                      })
                    }
                    style={{ background: blogSettings.sidebarPodBorderColor }}
                    title="Choose sidebar border color"
                    type="button"
                  >
                    <span aria-hidden="true">◒</span>
                  </button>
                </div>
                <label className="field admin-blog-compact-field">
                  <span>Fill</span>
                  <select
                    value={blogSettings.sidebarPodBackgroundMode}
                    onChange={(event) =>
                      updateBlogSetting(
                        "sidebarPodBackgroundMode",
                        event.target.value as BlogSettingsSnapshot["sidebarPodBackgroundMode"]
                      )
                    }
                  >
                    <option value="color">Color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Image</option>
                  </select>
                </label>
                <div className="field admin-blog-paint-field">
                  <span>Paint</span>
                  <button
                    className="admin-blog-rainbow-button"
                    onClick={() =>
                      openPaintSelector({
                        label: "Sidebar background",
                        modeKey: "sidebarPodBackgroundMode",
                        colorKey: "sidebarPodBackgroundColor",
                        gradientKey: "sidebarPodBackgroundGradient"
                      })
                    }
                    style={{
                      background:
                        blogSettings.sidebarPodBackgroundMode === "gradient"
                          ? blogSettings.sidebarPodBackgroundGradient
                          : blogSettings.sidebarPodBackgroundColor
                    }}
                    title="Choose sidebar background"
                    type="button"
                  >
                    <span aria-hidden="true">◒</span>
                  </button>
                </div>
                <div className="field admin-blog-image-field">
                  <span>Image</span>
                  <button
                    className="secondary-button admin-blog-mini-button"
                    onClick={() =>
                      openImageSelector({
                        modeKey: "sidebarPodBackgroundMode",
                        imageKey: "sidebarPodBackgroundImage"
                      })
                    }
                    type="button"
                  >
                    Select
                  </button>
                </div>
              </div>
            </section>
          </div>

          <button
            className="submit-button admin-save-button"
            disabled={isSaving}
            onClick={() => void saveBlogSettings()}
            type="button"
          >
            {isSaving ? "Saving..." : "Save settings"}
          </button>
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

      {paintTarget ? (
        <div className="admin-blog-paint-overlay" onClick={() => setPaintTarget(null)} role="presentation">
          <div
            aria-label={`${paintTarget.label} selector`}
            aria-modal="true"
            className="admin-blog-paint-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="admin-blog-paint-header">
              <div>
                <div className="panel-label">Paint</div>
                <h3>{paintTarget.label}</h3>
              </div>
              <button className="secondary-button admin-blog-mini-button" onClick={() => setPaintTarget(null)} type="button">
                Close
              </button>
            </div>
            <div className="admin-blog-paint-preview" style={{ background: buildPaintValue(paintDraft) }} />
            <div className="admin-blog-paint-tabs">
              {(["color", "gradient"] as BlogPaintMode[]).map((mode) => (
                <button
                  className={`secondary-button admin-blog-mini-button${paintDraft.mode === mode ? " is-active" : ""}`}
                  key={mode}
                  onClick={() => updatePaintDraft({ ...paintDraft, mode })}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="admin-blog-paint-controls">
              <label className="field">
                <span>{paintDraft.mode === "gradient" ? "Color 1" : "Color"}</span>
                <input
                  type="color"
                  value={paintDraft.color1}
                  onChange={(event) => updatePaintDraft({ ...paintDraft, color1: event.target.value })}
                />
              </label>
              {paintDraft.mode === "gradient" ? (
                <label className="field">
                  <span>Color 2</span>
                  <input
                    type="color"
                    value={paintDraft.color2}
                    onChange={(event) => updatePaintDraft({ ...paintDraft, color2: event.target.value })}
                  />
                </label>
              ) : null}
              <div className="admin-blog-opacity-row">
                <BuilderInlineNumberSelect
                  label="Opacity"
                  value={paintDraft.opacity}
                  min={0}
                  max={100}
                  fallback="100"
                  onChange={(opacity) => updatePaintDraft({ ...paintDraft, opacity })}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isGalleryOpen ? (
        <BuilderGalleryModal
          isUploading={isUploadingMedia}
          media={galleryMedia}
          onClose={() => {
            setIsGalleryOpen(false);
            setGalleryTarget(null);
          }}
          onSelectImage={selectGalleryImage}
          onUploadImage={(file) => void uploadMedia(file)}
        />
      ) : null}
    </section>
  );
}
