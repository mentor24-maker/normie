"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminPollDeepDiveEditor,
  type AdminBlogPostOption
} from "@/components/admin-poll-deep-dive-editor";
import type { PollRelatedPickerItem } from "@/components/poll-related-picker-modal";
import { normalizeDeepDiveRelatedPollIds } from "@/lib/poll-deep-dive";
import { sortPollCategoryNames } from "@/lib/load-poll-category-catalog";
import { usePollCategoryCatalog } from "@/lib/use-poll-category-catalog";

type PollOption = {
  id: string;
  label: string;
  sort_order: number;
};

type AdminPoll = {
  id: string;
  category: string | null;
  question: string;
  deep_dive?: string;
  deep_dive_youtube_url?: string;
  deep_dive_blog_post_id?: string | null;
  deep_dive_related_poll_ids?: unknown;
  image_url: string;
  order_index: number;
  created_at: string;
  is_published: boolean;
  poll_options: PollOption[];
};

type PollDraft = {
  category: string;
  question: string;
  deep_dive: string;
  deep_dive_youtube_url: string;
  deep_dive_blog_post_id: string;
  deep_dive_related_poll_ids: string[];
  image_url: string;
  order_index: string;
  is_published: boolean;
  poll_options: PollOption[];
};

function createDraftFromPoll(poll: AdminPoll): PollDraft {
  return {
    category: poll.category ?? "",
    question: poll.question,
    deep_dive: poll.deep_dive ?? "",
    deep_dive_youtube_url: poll.deep_dive_youtube_url ?? "",
    deep_dive_blog_post_id: poll.deep_dive_blog_post_id ?? "",
    deep_dive_related_poll_ids: normalizeDeepDiveRelatedPollIds(poll.deep_dive_related_poll_ids),
    image_url: poll.image_url ?? "",
    order_index: String(poll.order_index),
    is_published: poll.is_published,
    poll_options: poll.poll_options.map((option) => ({ ...option }))
  };
}

function createEmptyPollDraft(orderIndex: number): PollDraft {
  return {
    category: "",
    question: "",
    deep_dive: "",
    deep_dive_youtube_url: "",
    deep_dive_blog_post_id: "",
    deep_dive_related_poll_ids: [],
    image_url: "",
    order_index: String(orderIndex),
    is_published: true,
    poll_options: [
      { id: crypto.randomUUID(), label: "", sort_order: 1 },
      { id: crypto.randomUUID(), label: "", sort_order: 2 }
    ]
  };
}

type AdminPollEditorFormProps = {
  pollId?: string;
};

export function AdminPollEditorForm({ pollId }: AdminPollEditorFormProps) {
  const isCreating = !pollId;
  const router = useRouter();
  const [poll, setPoll] = useState<AdminPoll | null>(null);
  const [allPolls, setAllPolls] = useState<AdminPoll[]>([]);
  const [blogPosts, setBlogPosts] = useState<AdminBlogPostOption[]>([]);
  const [draft, setDraft] = useState<PollDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { catalog: pollCategoryCatalog } = usePollCategoryCatalog();
  const [prevPollId, setPrevPollId] = useState(pollId);

  // Show the loading state again when navigating to a different poll
  // (adjust-during-render; the effect below re-fetches).
  if (prevPollId !== pollId) {
    setPrevPollId(pollId);
    setIsLoading(true);
    setError(null);
    setMessage(null);
  }

  // Only called from the mount/pollId effect; isLoading starts true, so no
  // synchronous setState is needed before the fetch.
  const load = useCallback(async () => {
    try {
      const [pollRes, listRes, postsRes] = await Promise.all([
        pollId ? fetch(`/api/admin/polls/${pollId}`, { cache: "no-store" }) : Promise.resolve(null),
        fetch("/api/admin/polls", { cache: "no-store" }),
        fetch("/api/admin/blog/posts", { cache: "no-store" })
      ]);

      const pollJson = pollRes ? ((await pollRes.json()) as { poll?: AdminPoll; error?: string }) : null;
      const listJson = (await listRes.json()) as { polls?: AdminPoll[]; error?: string };
      const postsJson = (await postsRes.json()) as {
        posts?: Array<{ id: string; title: string; status: string }>;
      };

      if (pollRes && (!pollRes.ok || !pollJson?.poll)) {
        throw new Error(pollJson?.error ?? "Failed to load poll.");
      }

      if (!listRes.ok) {
        throw new Error(listJson.error ?? "Failed to load poll list.");
      }

      const loadedPolls = listJson.polls ?? [];
      setAllPolls(loadedPolls);

      if (pollJson?.poll) {
        setPoll(pollJson.poll);
        setDraft(createDraftFromPoll(pollJson.poll));
      } else {
        setPoll(null);
        setDraft(createEmptyPollDraft(Math.max(...loadedPolls.map((entry) => entry.order_index), 0) + 1));
      }

      if (postsRes.ok) {
        setBlogPosts(
          (postsJson.posts ?? []).map((post) => ({
            id: post.id,
            title: post.title,
            status: post.status
          }))
        );
      } else {
        setBlogPosts([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load.");
      setPoll(null);
      setDraft(null);
      setAllPolls([]);
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableCategories = useMemo(() => {
    const names = [
      ...pollCategoryCatalog.map((category) => category.name),
      ...allPolls.map((poll) => poll.category ?? "").filter(Boolean)
    ];
    return sortPollCategoryNames(names);
  }, [allPolls, pollCategoryCatalog]);

  const pickerPolls: PollRelatedPickerItem[] = useMemo(
    () =>
      allPolls.map((entry) => ({
        id: entry.id,
        question: entry.question,
        category: entry.category,
        order_index: entry.order_index
      })),
    [allPolls]
  );

  function updateDraft<K extends keyof PollDraft>(key: K, value: PollDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateDraftOption(optionId: string, label: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            poll_options: current.poll_options.map((option) =>
              option.id === optionId ? { ...option, label } : option
            )
          }
        : current
    );
  }

  function addDraftOption() {
    setDraft((current) =>
      current
        ? {
            ...current,
            poll_options: [
              ...current.poll_options,
              {
                id: crypto.randomUUID(),
                label: "",
                sort_order: current.poll_options.length + 1
              }
            ]
          }
        : current
    );
  }

  function removeDraftOption(optionId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            poll_options: current.poll_options
              .filter((option) => option.id !== optionId)
              .map((option, index) => ({ ...option, sort_order: index + 1 }))
          }
        : current
    );
  }

  async function savePoll() {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(isCreating ? "/api/admin/polls" : `/api/admin/polls/${pollId}`, {
        method: isCreating ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category: draft.category,
          question: draft.question,
          image_url: draft.image_url,
          order_index: Number.parseInt(draft.order_index, 10),
          is_published: draft.is_published,
          deep_dive: draft.deep_dive,
          deep_dive_youtube_url: draft.deep_dive_youtube_url,
          deep_dive_blog_post_id: draft.deep_dive_blog_post_id || null,
          deep_dive_related_poll_ids: draft.deep_dive_related_poll_ids,
          poll_options: draft.poll_options
        })
      });

      const data = (await response.json()) as { poll?: AdminPoll; error?: string };

      if (!response.ok || !data.poll) {
        throw new Error(data.error ?? "Failed to save poll.");
      }

      setPoll(data.poll);
      setDraft(createDraftFromPoll(data.poll));
      setAllPolls((current) =>
        [
          ...current.filter((p) => p.id !== data.poll!.id),
          data.poll!
        ].sort((a, b) => a.order_index - b.order_index)
      );
      setMessage(isCreating ? "Poll created." : "Poll saved.");
      router.refresh();
      if (isCreating) {
        router.push(`/admin/polls/${data.poll.id}/edit`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : isCreating ? "Failed to create poll." : "Failed to save poll.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="admin-stack">
        <section className="admin-section">
          <p className="page-copy admin-copy">Loading poll…</p>
        </section>
      </div>
    );
  }

  if (!draft || (!poll && !isCreating)) {
    return (
      <div className="admin-stack">
        <section className="admin-section">
          <div className="admin-toolbar">
            <Link className="secondary-button" href="/admin/polls">
              Back to Poll Manager
            </Link>
          </div>
          {error ? <div className="notice error admin-notice">{error}</div> : null}
          <p className="page-copy admin-copy">Poll could not be loaded.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-stack">
      <section className="admin-section admin-poll-editor-page">
        <div className="admin-toolbar admin-poll-editor-toolbar">
          <div>
            <div className="panel-label">Polls</div>
            <h2>{isCreating ? "Create Poll" : "Edit Poll"}</h2>
            <p className="page-copy admin-copy">{isCreating ? "Create a single poll without using CSV import." : `Order #${poll?.order_index}`}</p>
          </div>
          <div className="admin-actions">
            <Link className="secondary-button" href="/admin/polls">
              Back to Poll Manager
            </Link>
            <button
              className="submit-button admin-blog-add-button"
              disabled={isSaving}
              onClick={() => void savePoll()}
              type="button"
            >
              {isSaving ? (isCreating ? "Creating…" : "Saving…") : isCreating ? "Create Poll" : "Save Poll"}
            </button>
          </div>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}

        <div className="admin-poll-editor-fields">
          <label className="field">
            <span>Order</span>
            <input
              type="number"
              value={draft.order_index}
              onChange={(event) => updateDraft("order_index", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>
              <option value="">Uncategorized</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={draft.is_published ? "published" : "draft"}
              onChange={(event) => updateDraft("is_published", event.target.value === "published")}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>

          <label className="field admin-poll-editor-field-span-3">
            <span>Question</span>
            <textarea
              className="builder-textarea"
              value={draft.question}
              onChange={(event) => updateDraft("question", event.target.value)}
              rows={3}
            />
          </label>

          <label className="field admin-poll-editor-field-span-3">
            <span>Image URL</span>
            <input
              type="text"
              value={draft.image_url}
              onChange={(event) => updateDraft("image_url", event.target.value)}
              placeholder="https://… or /api/admin/media-file/…"
            />
          </label>

          <div className="field admin-poll-editor-field-span-3">
            <span>Options</span>
            <div className="polls-options-editor admin-poll-editor-options">
              {draft.poll_options.map((option, index) => (
                <div className="polls-option-editor-row" key={option.id}>
                  <textarea
                    className="builder-textarea polls-option-textarea"
                    value={option.label}
                    onChange={(event) => updateDraftOption(option.id, event.target.value)}
                    aria-label={`Option ${index + 1}`}
                  />
                  <button
                    aria-label={`Remove option ${index + 1}`}
                    className="polls-icon-button polls-icon-button-danger"
                    disabled={draft.poll_options.length <= 2}
                    onClick={() => removeDraftOption(option.id)}
                    type="button"
                  >
                    🗑
                  </button>
                </div>
              ))}
              <button className="secondary-button" onClick={addDraftOption} type="button">
                Add Option
              </button>
            </div>
          </div>
        </div>

        <div className="admin-poll-editor-deep-dive">
          <AdminPollDeepDiveEditor
            pollId={pollId ?? ""}
            draft={{
              deep_dive_youtube_url: draft.deep_dive_youtube_url,
              deep_dive_blog_post_id: draft.deep_dive_blog_post_id,
              deep_dive_related_poll_ids: draft.deep_dive_related_poll_ids
            }}
            allPolls={pickerPolls}
            blogPosts={blogPosts}
            hideSaveButton
            isSaving={isSaving}
            onChange={(patch) => {
              for (const [key, value] of Object.entries(patch)) {
                updateDraft(key as keyof PollDraft, value as PollDraft[keyof PollDraft]);
              }
            }}
          />
        </div>

        <div className="admin-poll-editor-footer">
          <button
            className="submit-button admin-blog-add-button"
            disabled={isSaving}
            onClick={() => void savePoll()}
            type="button"
          >
            {isSaving ? (isCreating ? "Creating…" : "Saving…") : isCreating ? "Create Poll" : "Save Poll"}
          </button>
        </div>
      </section>
    </div>
  );
}
