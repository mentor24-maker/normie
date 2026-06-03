"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import { bulkUpdateGalleryMediaMetadata } from "@/lib/gallery-media-bulk";
import { sortPollCategoryNames } from "@/lib/load-poll-category-catalog";
import { usePollCategoryCatalog } from "@/lib/use-poll-category-catalog";

type PollPickerRow = {
  id: string;
  category: string | null;
  question: string;
  image_url: string;
  order_index: number;
};

type GalleryPollAssociateMenuProps = {
  storageNames: string[];
  onAssociated: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
};

async function associateStorageWithPoll(storageName: string, pollId: string): Promise<PollPickerRow> {
  const response = await fetch("/api/admin/gallery/associate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pollId,
      storageName
    })
  });
  const data = await readAdminJson<{ poll?: PollPickerRow; error?: string }>(
    response,
    "Failed to associate gallery media with poll."
  );

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to associate gallery media with poll.");
  }

  if (!data.poll) {
    throw new Error("Failed to associate gallery media with poll.");
  }

  return data.poll;
}

export function GalleryPollAssociateMenu({
  storageNames,
  onAssociated,
  onError,
  onClose
}: GalleryPollAssociateMenuProps) {
  const listId = useId();
  const isBulk = storageNames.length > 1;
  const [questionFilter, setQuestionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [polls, setPolls] = useState<PollPickerRow[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssociatingAll, setIsAssociatingAll] = useState(false);
  const { catalog: pollCategoryCatalog } = usePollCategoryCatalog();
  const pickerCategories = useMemo(
    () => sortPollCategoryNames(pollCategoryCatalog.map((category) => category.name)),
    [pollCategoryCatalog]
  );

  const questionSuggestions = useMemo(() => {
    const seen = new Set<string>();

    return polls
      .map((poll) => poll.question.trim())
      .filter((question) => {
        if (!question || seen.has(question)) {
          return false;
        }

        seen.add(question);
        return true;
      })
      .slice(0, 40);
  }, [polls]);

  async function loadPolls(nextQuestion: string, nextCategory: string) {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextQuestion.trim()) {
        params.set("question", nextQuestion.trim());
      }

      if (nextCategory.trim()) {
        params.set("category", nextCategory.trim());
      }

      const query = params.toString();
      const response = await fetch(`/api/admin/polls/picker${query ? `?${query}` : ""}`, {
        cache: "no-store"
      });
      const data = await readAdminJson<{ polls?: PollPickerRow[]; error?: string }>(
        response,
        "Failed to load polls."
      );

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load polls.");
      }

      setPolls(data.polls ?? []);
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : "Failed to load polls.");
      setPolls([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPolls("", "");
  }, []);

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
    void loadPolls(questionFilter, categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadPolls(questionFilter, categoryFilter);
    }, 320);

    return () => window.clearTimeout(handle);
  }, [questionFilter]);

  useEffect(() => {
    if (selectedPollId && !polls.some((poll) => poll.id === selectedPollId)) {
      setSelectedPollId(null);
    }
  }, [polls, selectedPollId]);

  const selectedPoll = useMemo(
    () => polls.find((poll) => poll.id === selectedPollId) ?? null,
    [polls, selectedPollId]
  );

  async function saveAssociation() {
    const storageName = storageNames[0];

    if (!storageName || !selectedPoll || isBulk) {
      return;
    }

    setIsSaving(true);

    try {
      await associateStorageWithPoll(storageName, selectedPoll.id);
      onAssociated(`Associated ${storageName} with “${selectedPoll.question}”.`);
      onClose();
    } catch (associateError) {
      onError(
        associateError instanceof Error ? associateError.message : "Failed to associate gallery media with poll."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function associateAllWithCategory() {
    const category = categoryFilter.trim();

    if (!category) {
      onError("Choose a category before associating all selected files.");
      return;
    }

    if (polls.length === 0) {
      onError(`No polls found in ${category}.`);
      return;
    }

    setIsAssociatingAll(true);

    try {
      const pairCount = Math.min(storageNames.length, polls.length);
      const failures: string[] = [];

      for (let index = 0; index < pairCount; index += 1) {
        const storageName = storageNames[index];
        const poll = polls[index];

        try {
          await associateStorageWithPoll(storageName, poll.id);
        } catch (error) {
          failures.push(
            `${storageName}: ${error instanceof Error ? error.message : "Association failed."}`
          );
        }
      }

      await bulkUpdateGalleryMediaMetadata(storageNames, { media_category: category });

      if (pairCount === 0) {
        throw new Error("No files or polls available to associate.");
      }

      if (failures.length === pairCount) {
        throw new Error(failures[0] ?? "Failed to associate gallery media with polls.");
      }

      const extraFiles = storageNames.length - pairCount;
      const extraPolls = polls.length - pairCount;
      const parts = [
        `Associated ${pairCount - failures.length} file${pairCount - failures.length === 1 ? "" : "s"} with ${category} polls`
      ];

      if (extraFiles > 0) {
        parts.push(`${extraFiles} extra file${extraFiles === 1 ? "" : "s"} had no matching poll`);
      }

      if (extraPolls > 0) {
        parts.push(`${extraPolls} poll${extraPolls === 1 ? "" : "s"} had no file assigned`);
      }

      if (failures.length > 0) {
        parts.push(`${failures.length} failed`);
      }

      onAssociated(`${parts.join("; ")}.`);
      onClose();
    } catch (associateError) {
      onError(
        associateError instanceof Error
          ? associateError.message
          : "Failed to associate selected gallery media."
      );
    } finally {
      setIsAssociatingAll(false);
    }
  }

  const saveDisabled = !selectedPoll || isLoading || isSaving || isAssociatingAll;
  const bulkAssociateDisabled =
    !categoryFilter.trim() || polls.length === 0 || isLoading || isSaving || isAssociatingAll;

  return (
    <div className="admin-gallery-associate-menu admin-gallery-popup-panel" role="dialog" aria-label="Associate with poll">
      <div className="admin-gallery-associate-filters">
        <label className="admin-gallery-associate-field">
          <span className="admin-gallery-associate-label">Question</span>
          <input
            aria-label="Search poll question"
            list={listId}
            onChange={(event) => setQuestionFilter(event.target.value)}
            placeholder="Search questions"
            type="search"
            value={questionFilter}
          />
          <datalist id={listId}>
            {questionSuggestions.map((question) => (
              <option key={question} value={question} />
            ))}
          </datalist>
        </label>
        <label className="admin-gallery-associate-field">
          <span className="admin-gallery-associate-label">Category</span>
          <select
            aria-label="Filter polls by category"
            onChange={(event) => setCategoryFilter(event.target.value)}
            value={categoryFilter}
          >
            <option value="">All categories</option>
            {pickerCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isBulk ? (
        <p className="admin-gallery-associate-bulk-hint">
          Choose a category, then associate {storageNames.length} selected file
          {storageNames.length === 1 ? "" : "s"} with polls in that category (in list order).
        </p>
      ) : (
        <p className="admin-gallery-associate-hint">Select a poll, then click Save Association.</p>
      )}

      <div
        className="admin-gallery-associate-list"
        role="listbox"
        aria-label="Polls"
        aria-activedescendant={selectedPollId ? `associate-poll-${selectedPollId}` : undefined}
      >
        {isLoading && polls.length === 0 ? (
          <p className="admin-gallery-associate-empty">Loading polls...</p>
        ) : null}
        {!isLoading && polls.length === 0 ? (
          <p className="admin-gallery-associate-empty">No polls match these filters.</p>
        ) : null}
        {polls.map((poll) => {
          const isSelected = selectedPollId === poll.id;

          return (
            <button
              aria-selected={isSelected}
              className={
                isSelected
                  ? "admin-gallery-associate-option is-selected"
                  : "admin-gallery-associate-option"
              }
              disabled={isSaving || isAssociatingAll || isBulk}
              id={`associate-poll-${poll.id}`}
              key={poll.id}
              onClick={() => setSelectedPollId(poll.id)}
              role="option"
              title={isBulk ? "Use Associate All for multiple files" : undefined}
              type="button"
            >
              <span className="admin-gallery-associate-option-question">{poll.question}</span>
              <span className="admin-gallery-associate-option-meta">
                {poll.category ?? "Uncategorized"} · #{poll.order_index}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-gallery-associate-footer">
        {isBulk ? (
          <button
            className="submit-button admin-blog-add-button"
            disabled={bulkAssociateDisabled}
            onClick={() => void associateAllWithCategory()}
            type="button"
          >
            {isAssociatingAll ? "Associating..." : `Associate All (${storageNames.length})`}
          </button>
        ) : (
          <div className="admin-gallery-associate-footer-actions">
            <button className="secondary-button" disabled={isSaving} onClick={onClose} type="button">
              Cancel
            </button>
            <button
              aria-label="Save gallery association to selected poll"
              className="submit-button admin-blog-add-button"
              disabled={saveDisabled}
              onClick={() => void saveAssociation()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Association"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
