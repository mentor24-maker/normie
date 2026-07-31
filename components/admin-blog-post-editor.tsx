"use client";

import { useMemo, useState } from "react";
import {
  normalizeBlogSlugInput,
  slugifyBlogText,
  type BlogCategoryRecord,
  type BlogPostEditorInput,
  type BlogPostRecord,
  type BlogPostStatus,
  type BlogTagRecord,
  type BlogTopicRecord,
  type BlogTwitterCardType
} from "@/lib/blog";
import { BlogFeaturedImageThumb } from "@/components/blog-featured-image-thumb";
import { BlogRichTextEditor } from "@/components/blog-rich-text-editor";
import { BuilderGalleryModal } from "@/components/builder/builder-gallery-modal";

type TeamAuthor = {
  id: string;
  fullName: string;
};

type GalleryTarget = "featured" | "og" | "body" | "bodyVideo";

type AdminBlogPostEditorProps = {
  draft: BlogPostEditorInput & { id?: string };
  topics: BlogTopicRecord[];
  categories: BlogCategoryRecord[];
  tags: BlogTagRecord[];
  posts: BlogPostRecord[];
  authors: TeamAuthor[];
  canPublish: boolean;
  isSaving: boolean;
  onChange: (draft: BlogPostEditorInput & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
};

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminBlogPostEditor({
  draft,
  topics,
  categories,
  tags,
  posts,
  authors,
  canPublish,
  isSaving,
  onChange,
  onSave,
  onCancel
}: AdminBlogPostEditorProps) {
  const [galleryTarget, setGalleryTarget] = useState<GalleryTarget | null>(null);
  const [pendingBodyImage, setPendingBodyImage] = useState<string | null>(null);
  const [pendingBodyVideo, setPendingBodyVideo] = useState<string | null>(null);

  const statusOptions: BlogPostStatus[] = canPublish
    ? ["draft", "scheduled", "published"]
    : ["draft", "scheduled"];

  const relatedCandidates = useMemo(
    () => posts.filter((post) => post.id !== draft.id),
    [draft.id, posts]
  );

  function openGallery(target: GalleryTarget) {
    setGalleryTarget(target);
  }

  function applyGalleryImage(imagePath: string) {
    if (galleryTarget === "featured") {
      onChange({ ...draft, featuredImageUrl: imagePath });
    } else if (galleryTarget === "og") {
      onChange({ ...draft, ogImageUrl: imagePath });
    } else if (galleryTarget === "body") {
      setPendingBodyImage(imagePath);
    } else if (galleryTarget === "bodyVideo") {
      setPendingBodyVideo(imagePath);
    }

    setGalleryTarget(null);
  }

  function toggleTopic(topicId: string) {
    const hasTopic = draft.topicIds.includes(topicId);
    const topicIds = hasTopic ? draft.topicIds.filter((id) => id !== topicId) : [...draft.topicIds, topicId];
    const primaryTopicId =
      draft.primaryTopicId && topicIds.includes(draft.primaryTopicId)
        ? draft.primaryTopicId
        : topicIds[0] ?? null;

    onChange({ ...draft, topicIds, primaryTopicId });
  }

  function toggleCategory(categoryId: string) {
    const hasCategory = draft.categoryIds.includes(categoryId);
    const categoryIds = hasCategory
      ? draft.categoryIds.filter((id) => id !== categoryId)
      : [...draft.categoryIds, categoryId];
    const primaryCategoryId =
      draft.primaryCategoryId && categoryIds.includes(draft.primaryCategoryId)
        ? draft.primaryCategoryId
        : categoryIds[0] ?? null;

    onChange({ ...draft, categoryIds, primaryCategoryId });
  }

  function toggleTag(tagId: string) {
    const tagIds = draft.tagIds.includes(tagId)
      ? draft.tagIds.filter((id) => id !== tagId)
      : [...draft.tagIds, tagId];
    onChange({ ...draft, tagIds });
  }

  function toggleRelatedPost(postId: string) {
    const relatedPostIds = draft.relatedPostIds.includes(postId)
      ? draft.relatedPostIds.filter((id) => id !== postId)
      : [...draft.relatedPostIds, postId];
    onChange({ ...draft, relatedPostIds });
  }

  return (
    <section className="admin-blog-editor">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-section-heading">{draft.id ? "Edit post" : "New post"}</h2>
          <p className="page-copy admin-copy">Main content uses the blog editor. SEO fields fall back to title, excerpt, and featured image.</p>
        </div>
        <div className="admin-actions">
          <button className="secondary-button" disabled={isSaving} onClick={onCancel} type="button">
            Back
          </button>
          <button
            className="submit-button admin-blog-add-button"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save post"}
          </button>
        </div>
      </div>

      <div className="admin-blog-editor-layout">
        <div className="admin-blog-editor-main">
          <label className="field">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                onChange({
                  ...draft,
                  title,
                  slug: draft.slug || slugifyBlogText(title)
                });
              }}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              value={draft.slug}
              onChange={(event) => onChange({ ...draft, slug: normalizeBlogSlugInput(event.target.value) })}
              placeholder="my-post-slug"
            />
          </label>
          <label className="field">
            <span>Excerpt</span>
            <textarea
              rows={3}
              value={draft.excerpt}
              onChange={(event) => onChange({ ...draft, excerpt: event.target.value })}
            />
          </label>
          <div className="field">
            <span>Body</span>
            <BlogRichTextEditor
              value={draft.bodyHtml}
              onChange={(bodyHtml) => onChange({ ...draft, bodyHtml })}
              onOpenGallery={() => void openGallery("body")}
              onOpenVideoGallery={() => void openGallery("bodyVideo")}
              galleryImagePath={pendingBodyImage}
              onGalleryImageConsumed={() => setPendingBodyImage(null)}
              galleryVideoPath={pendingBodyVideo}
              onGalleryVideoConsumed={() => setPendingBodyVideo(null)}
            />
          </div>
        </div>

        <aside className="admin-blog-editor-sidebar">
          <label className="field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => onChange({ ...draft, status: event.target.value as BlogPostStatus })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {!canPublish ? (
              <p className="admin-table-subcopy">Admins and owners can publish from the posts list.</p>
            ) : null}
          </label>
          <label className="field">
            <span>Publish date</span>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(draft.publishedAt)}
              onChange={(event) =>
                onChange({
                  ...draft,
                  publishedAt: event.target.value ? new Date(event.target.value).toISOString() : null
                })
              }
            />
          </label>
          <label className="field">
            <span>Author</span>
            <select
              value={draft.authorTeamUserId ?? ""}
              onChange={(event) =>
                onChange({ ...draft, authorTeamUserId: event.target.value || null })
              }
            >
              <option value="">Normie</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Featured image</span>
            <div className="admin-blog-image-field">
              <input readOnly value={draft.featuredImageUrl} />
              <button className="secondary-button" onClick={() => void openGallery("featured")} type="button">
                Gallery
              </button>
            </div>
            {draft.featuredImageUrl ? (
              <div className="admin-blog-featured-image-preview">
                <BlogFeaturedImageThumb imageUrl={draft.featuredImageUrl} />
              </div>
            ) : null}
          </div>

          <fieldset className="admin-blog-fieldset">
            <legend>Topics</legend>
            {topics.map((topic) => (
              <label className="admin-blog-check" key={topic.id}>
                <input
                  checked={draft.topicIds.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                  type="checkbox"
                />
                <span>{topic.name}</span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Primary topic (URL)</span>
            <select
              value={draft.primaryTopicId ?? ""}
              onChange={(event) => onChange({ ...draft, primaryTopicId: event.target.value || null })}
            >
              <option value="">Select primary topic</option>
              {draft.topicIds.map((topicId) => {
                const topic = topics.find((candidate) => candidate.id === topicId);
                return topic ? (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ) : null;
              })}
            </select>
          </label>

          <fieldset className="admin-blog-fieldset">
            <legend>Categories</legend>
            {categories.map((category) => (
              <label className="admin-blog-check" key={category.id}>
                <input
                  checked={draft.categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  type="checkbox"
                />
                <span>{category.name}</span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Primary category</span>
            <select
              value={draft.primaryCategoryId ?? ""}
              onChange={(event) => onChange({ ...draft, primaryCategoryId: event.target.value || null })}
            >
              <option value="">Select primary category</option>
              {draft.categoryIds.map((categoryId) => {
                const category = categories.find((candidate) => candidate.id === categoryId);
                return category ? (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ) : null;
              })}
            </select>
          </label>

          <fieldset className="admin-blog-fieldset">
            <legend>Tags</legend>
            {tags.map((tag) => (
              <label className="admin-blog-check" key={tag.id}>
                <input checked={draft.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} type="checkbox" />
                <span>{tag.name}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="admin-blog-fieldset">
            <legend>Related posts</legend>
            {relatedCandidates.map((post) => (
              <label className="admin-blog-check" key={post.id}>
                <input
                  checked={draft.relatedPostIds.includes(post.id)}
                  onChange={() => toggleRelatedPost(post.id)}
                  type="checkbox"
                />
                <span>{post.title}</span>
              </label>
            ))}
          </fieldset>

          <details className="admin-blog-seo-panel">
            <summary>SEO & social</summary>
            <label className="field">
              <span>Meta title</span>
              <input value={draft.metaTitle} onChange={(event) => onChange({ ...draft, metaTitle: event.target.value })} />
            </label>
            <label className="field">
              <span>Meta description</span>
              <textarea
                rows={2}
                value={draft.metaDescription}
                onChange={(event) => onChange({ ...draft, metaDescription: event.target.value })}
              />
            </label>
            <label className="field">
              <span>OG title</span>
              <input value={draft.ogTitle} onChange={(event) => onChange({ ...draft, ogTitle: event.target.value })} />
            </label>
            <label className="field">
              <span>OG description</span>
              <textarea
                rows={2}
                value={draft.ogDescription}
                onChange={(event) => onChange({ ...draft, ogDescription: event.target.value })}
              />
            </label>
            <div className="field">
              <span>OG image</span>
              <div className="admin-blog-image-field">
                <input readOnly value={draft.ogImageUrl} />
                <button className="secondary-button" onClick={() => void openGallery("og")} type="button">
                  Gallery
                </button>
              </div>
            </div>
            <label className="field">
              <span>Twitter card</span>
              <select
                value={draft.twitterCardType}
                onChange={(event) =>
                  onChange({ ...draft, twitterCardType: event.target.value as BlogTwitterCardType })
                }
              >
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </label>
            <label className="field">
              <span>Canonical URL</span>
              <input
                value={draft.canonicalUrl}
                onChange={(event) => onChange({ ...draft, canonicalUrl: event.target.value })}
              />
            </label>
            <label className="admin-blog-check">
              <input
                checked={draft.noindex}
                onChange={(event) => onChange({ ...draft, noindex: event.target.checked })}
                type="checkbox"
              />
              <span>Noindex</span>
            </label>
          </details>
        </aside>
      </div>

      {galleryTarget ? (
        <BuilderGalleryModal
          isUploading={false}
          onClose={() => setGalleryTarget(null)}
          onSelectImage={applyGalleryImage}
        />
      ) : null}
    </section>
  );
}
