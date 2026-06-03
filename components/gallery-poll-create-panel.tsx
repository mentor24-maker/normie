"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import { galleryFileNameToQuestionHint } from "@/lib/gallery-display-filename";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import { buildPollCategoryCatalog } from "@/lib/poll-categories";
import { sortPollCategoryNames } from "@/lib/load-poll-category-catalog";
import { usePollCategoryCatalog } from "@/lib/use-poll-category-catalog";

type PollOptionDraft = {
  id: string;
  label: string;
  sort_order: number;
};

type PollCreateDraft = {
  category: string;
  question: string;
  image_url: string;
  order_index: string;
  is_published: boolean;
  poll_options: PollOptionDraft[];
};

type GalleryPollCreatePanelProps = {
  storageName: string;
  fileName: string;
  imagePath: string;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
};

function createOption(sortOrder: number): PollOptionDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    sort_order: sortOrder
  };
}

export function GalleryPollCreatePanel({
  storageName,
  fileName,
  imagePath,
  onCreated,
  onError,
  onClose
}: GalleryPollCreatePanelProps) {
  const imageUrl = `/gallery/${storageName.replace(/^\/+/, "")}`;
  const previewSrc = getGalleryMediaThumbnailUrl(imagePath, 320);
  const [draft, setDraft] = useState<PollCreateDraft | null>(null);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { catalog: pollCategoryCatalog } = usePollCategoryCatalog();
  const categories = useMemo(() => {
    const merged = buildPollCategoryCatalog([
      ...pollCategoryCatalog.map((category) => category.name),
      ...extraCategories
    ]);
    return sortPollCategoryNames(merged.map((category) => category.name));
  }, [extraCategories, pollCategoryCatalog]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/polls", { cache: "no-store" });
        const data = await readAdminJson<{
          polls?: Array<{ order_index: number; category: string | null }>;
          error?: string;
        }>(response, "Failed to load polls.");

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load polls.");
        }

        if (cancelled) {
          return;
        }

        const polls = data.polls ?? [];
        const nextOrder = Math.max(0, ...polls.map((poll) => poll.order_index)) + 1;
        const questionHint = galleryFileNameToQuestionHint(fileName);

        setExtraCategories(
          polls.map((poll) => poll.category ?? "").filter((category): category is string => Boolean(category))
        );
        setDraft({
          category: "",
          question: questionHint,
          image_url: imageUrl,
          order_index: String(nextOrder),
          is_published: true,
          poll_options: [createOption(1), createOption(2)]
        });
      } catch (loadError) {
        onError(loadError instanceof Error ? loadError.message : "Failed to load poll defaults.");
        onClose();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fileName, imageUrl, onClose, onError]);

  function updateDraft<K extends keyof PollCreateDraft>(key: K, value: PollCreateDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateOption(optionId: string, label: string) {
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

  function addOption() {
    setDraft((current) =>
      current
        ? {
            ...current,
            poll_options: [
              ...current.poll_options,
              createOption(current.poll_options.length + 1)
            ]
          }
        : current
    );
  }

  function removeOption(optionId: string) {
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

  async function createPoll() {
    if (!draft) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          question: draft.question,
          image_url: draft.image_url,
          order_index: Number.parseInt(draft.order_index, 10),
          is_published: draft.is_published,
          deep_dive: "",
          deep_dive_youtube_url: "",
          deep_dive_blog_post_id: null,
          deep_dive_related_poll_ids: [],
          poll_options: draft.poll_options
        })
      });
      const data = await readAdminJson<{ poll?: { question: string }; error?: string }>(
        response,
        "Failed to create poll."
      );

      if (!response.ok || !data.poll) {
        throw new Error(data.error ?? "Failed to create poll.");
      }

      onCreated(`Created poll “${data.poll.question}” with ${fileName}.`);
      onClose();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Failed to create poll.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="admin-gallery-create-panel admin-gallery-popup-panel"
      role="dialog"
      aria-labelledby="admin-gallery-create-title"
    >
      <a
        className="admin-gallery-popup-image-link"
        href={imagePath}
        rel="noopener noreferrer"
        target="_blank"
        title="Open full-size image"
      >
        <div className="admin-gallery-popup-image">
          <Image alt={fileName} fill sizes="320px" src={previewSrc} />
        </div>
        <span className="admin-gallery-popup-image-hint">View Full Size</span>
      </a>

      <div className="admin-gallery-create-heading">
        <div className="panel-label">Gallery</div>
        <h3 id="admin-gallery-create-title">Create Poll</h3>
        <p className="page-copy admin-copy admin-gallery-create-copy">
          This image will be saved on the new poll. Edit the question and options before creating.
        </p>
      </div>

      {isLoading || !draft ? (
        <p className="page-copy admin-copy">Loading form...</p>
      ) : (
        <>
          <div className="admin-gallery-create-fields">
            <label className="admin-gallery-create-field">
              <span className="admin-gallery-create-label">Order</span>
              <input
                type="number"
                value={draft.order_index}
                onChange={(event) => updateDraft("order_index", event.target.value)}
              />
            </label>
            <label className="admin-gallery-create-field">
              <span className="admin-gallery-create-label">Category</span>
              <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-gallery-create-field">
              <span className="admin-gallery-create-label">Status</span>
              <select
                value={draft.is_published ? "published" : "draft"}
                onChange={(event) => updateDraft("is_published", event.target.value === "published")}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="admin-gallery-create-field admin-gallery-create-field-span">
              <span className="admin-gallery-create-label">Question</span>
              <textarea
                className="builder-textarea"
                rows={3}
                value={draft.question}
                onChange={(event) => updateDraft("question", event.target.value)}
              />
            </label>
            <div className="admin-gallery-create-field admin-gallery-create-field-span admin-gallery-create-options">
              <span className="admin-gallery-create-label">Options</span>
              <div className="admin-gallery-create-options-list">
                {draft.poll_options.map((option, index) => (
                  <div className="polls-option-editor-row" key={option.id}>
                    <textarea
                      className="builder-textarea polls-option-textarea"
                      value={option.label}
                      onChange={(event) => updateOption(option.id, event.target.value)}
                      aria-label={`Option ${index + 1}`}
                    />
                    <button
                      aria-label={`Remove option ${index + 1}`}
                      className="polls-icon-button polls-icon-button-danger"
                      disabled={draft.poll_options.length <= 2}
                      onClick={() => removeOption(option.id)}
                      type="button"
                    >
                      🗑
                    </button>
                  </div>
                ))}
                <button className="secondary-button" onClick={addOption} type="button">
                  Add Option
                </button>
              </div>
            </div>
          </div>

          <div className="admin-gallery-create-footer">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="submit-button admin-blog-add-button"
              disabled={isSaving}
              onClick={() => void createPoll()}
              type="button"
            >
              {isSaving ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
