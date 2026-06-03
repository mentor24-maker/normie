"use client";

import { useState } from "react";
import {
  PollRelatedPickerModal,
  type PollRelatedPickerItem
} from "@/components/poll-related-picker-modal";
import { DEEP_DIVE_RELATED_LIMIT } from "@/lib/poll-deep-dive-constants";

export type AdminBlogPostOption = {
  id: string;
  title: string;
  status: string;
};

export type AdminPollDeepDiveDraft = {
  deep_dive_youtube_url: string;
  deep_dive_blog_post_id: string;
  deep_dive_related_poll_ids: string[];
};

type AdminPollDeepDiveEditorProps = {
  pollId: string;
  draft: AdminPollDeepDiveDraft;
  allPolls: PollRelatedPickerItem[];
  blogPosts: AdminBlogPostOption[];
  isSaving: boolean;
  hideSaveButton?: boolean;
  onChange: (patch: Partial<AdminPollDeepDiveDraft>) => void;
  onSave?: () => void;
};

export function summarizeYoutube(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "—";
  }

  return trimmed.length > 42 ? `${trimmed.slice(0, 39)}…` : trimmed;
}

export function summarizeDeepDiveBlogPost(
  postId: string,
  blogPosts: AdminBlogPostOption[]
) {
  if (!postId) {
    return "—";
  }

  const post = blogPosts.find((entry) => entry.id === postId);
  return post ? post.title : "Unknown post";
}

export function summarizeDeepDiveRelatedPolls(count: number) {
  if (count === 0) {
    return "—";
  }

  return `${count} selected`;
}

export function AdminPollDeepDiveEditor({
  pollId,
  draft,
  allPolls,
  blogPosts,
  isSaving,
  hideSaveButton = false,
  onChange,
  onSave
}: AdminPollDeepDiveEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const publishedPosts = blogPosts.filter((post) => post.status === "published");

  return (
    <>
      <div className="polls-deep-dive-editor">
        <div className="polls-deep-dive-editor-header">
          <strong>Deep Dive</strong>
          <span className="polls-deep-dive-editor-copy">
            The Previous Results overlay shows one block: a blog card if a post is set, otherwise an
            embedded YouTube URL, otherwise up to {DEEP_DIVE_RELATED_LIMIT} related questions (your
            picks first, then the same category).
          </span>
        </div>

        <div className="polls-deep-dive-fields">
          <label className="field">
            <span>YouTube URL</span>
            <input
              type="url"
              value={draft.deep_dive_youtube_url}
              onChange={(event) => onChange({ deep_dive_youtube_url: event.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <label className="field">
            <span>Blog Post</span>
            <select
              value={draft.deep_dive_blog_post_id}
              onChange={(event) => onChange({ deep_dive_blog_post_id: event.target.value })}
            >
              <option value="">None</option>
              {publishedPosts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Related Polls</span>
            <div className="polls-deep-dive-related-actions">
              <p className="polls-deep-dive-editor-copy">
                {summarizeDeepDiveRelatedPolls(draft.deep_dive_related_poll_ids.length)}
              </p>
              <button
                className="secondary-button"
                onClick={() => setPickerOpen(true)}
                type="button"
              >
                Choose Polls
              </button>
            </div>
          </div>
        </div>

        {!hideSaveButton ? (
          <div className="polls-deep-dive-save-row">
            <button
              className="submit-button admin-blog-add-button"
              disabled={isSaving}
              onClick={() => {
                onSave?.();
              }}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Deep Dive"}
            </button>
          </div>
        ) : null}
      </div>

      {pickerOpen ? (
        <PollRelatedPickerModal
          polls={allPolls}
          currentPollId={pollId}
          onApply={(ids) => onChange({ deep_dive_related_poll_ids: ids })}
          onClose={() => setPickerOpen(false)}
          selectedIds={draft.deep_dive_related_poll_ids}
        />
      ) : null}
    </>
  );
}
