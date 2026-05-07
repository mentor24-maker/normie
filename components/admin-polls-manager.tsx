"use client";

import { useEffect, useMemo, useState } from "react";
import { CsvImportForm } from "@/components/csv-import-form";

type PollOption = {
  id: string;
  label: string;
  sort_order: number;
};

type AdminPoll = {
  id: string;
  category: string | null;
  question: string;
  order_index: number;
  created_at: string;
  is_published: boolean;
  poll_options: PollOption[];
};

type PollFilterState = {
  order: string;
  category: string;
  question: string;
  options: string;
  status: "all" | "published" | "draft";
};

type PollDraft = {
  category: string;
  question: string;
  order_index: string;
  is_published: boolean;
  poll_options: PollOption[];
};

const POLL_CATEGORIES = [
  "Identity & Psychology",
  "Money & Success",
  "Dark / Truth",
  "Social & Relationships",
  "Life Tradeoffs",
  "Future / Power",
  "Self-Perception",
  "Behavior & Habits",
  "Modern Life / Digital",
  "Absurd but Revealing"
] as const;

const emptyFilters: PollFilterState = {
  order: "",
  category: "",
  question: "",
  options: "",
  status: "all"
};

function createDraftFromPoll(poll: AdminPoll): PollDraft {
  return {
    category: poll.category ?? "",
    question: poll.question,
    order_index: String(poll.order_index),
    is_published: poll.is_published,
    poll_options: poll.poll_options.map((option) => ({ ...option }))
  };
}

function matchesFilter(value: string | number | null | undefined, filter: string) {
  if (!filter.trim()) {
    return true;
  }

  return String(value ?? "")
    .toLowerCase()
    .includes(filter.trim().toLowerCase());
}

export function AdminPollsManager() {
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PollDraft | null>(null);
  const [filters, setFilters] = useState<PollFilterState>(emptyFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPolls() {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls", {
        cache: "no-store"
      });

      const data = (await response.json()) as { polls?: AdminPoll[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load polls.");
      }

      setPolls(data.polls ?? []);
      setSelectedPollIds((current) => current.filter((id) => (data.polls ?? []).some((poll) => poll.id === id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load polls.");
      setPolls([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPolls();
  }, []);

  const availableCategories = useMemo(() => {
    return [
      ...new Set([
        ...POLL_CATEGORIES,
        ...polls.map((poll) => poll.category ?? "").filter(Boolean)
      ])
    ];
  }, [polls]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const optionsText = poll.poll_options.map((option) => option.label).join(" ");
      const statusText = poll.is_published ? "published" : "draft";

      return (
        matchesFilter(poll.order_index, filters.order) &&
        (!filters.category || (poll.category ?? "") === filters.category) &&
        matchesFilter(poll.question, filters.question) &&
        matchesFilter(optionsText, filters.options) &&
        (filters.status === "all" || statusText === filters.status)
      );
    });
  }, [filters, polls]);

  const allSelected =
    filteredPolls.length > 0 && filteredPolls.every((poll) => selectedPollIds.includes(poll.id));

  const pollCountSummary = useMemo(() => {
    if (isLoading) {
      return "Loading polls...";
    }

    if (filteredPolls.length === polls.length) {
      return `${polls.length} poll${polls.length === 1 ? "" : "s"} loaded`;
    }

    return `${filteredPolls.length} of ${polls.length} polls shown`;
  }, [filteredPolls.length, isLoading, polls.length]);

  function togglePollSelection(pollId: string) {
    setSelectedPollIds((current) =>
      current.includes(pollId) ? current.filter((id) => id !== pollId) : [...current, pollId]
    );
  }

  function toggleSelectAll() {
    const filteredIds = filteredPolls.map((poll) => poll.id);

    setSelectedPollIds((current) => {
      if (allSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return [...new Set([...current, ...filteredIds])];
    });
  }

  function startEditing(poll: AdminPoll) {
    setEditingPollId(poll.id);
    setDraft(createDraftFromPoll(poll));
    setError(null);
    setMessage(null);
  }

  function cancelEditing() {
    setEditingPollId(null);
    setDraft(null);
  }

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

  async function savePoll(pollId: string) {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category: draft.category,
          question: draft.question,
          order_index: Number.parseInt(draft.order_index, 10),
          is_published: draft.is_published,
          poll_options: draft.poll_options
        })
      });

      const data = (await response.json()) as { poll?: AdminPoll; error?: string };

      if (!response.ok || !data.poll) {
        throw new Error(data.error ?? "Failed to save poll.");
      }

      setPolls((current) =>
        current
          .map((poll) => (poll.id === pollId ? data.poll! : poll))
          .sort((a, b) => a.order_index - b.order_index)
      );
      setMessage("Poll updated.");
      cancelEditing();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save poll.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePolls(pollIds: string[]) {
    if (pollIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${pollIds.length} poll(s)? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pollIds
        })
      });

      const data = (await response.json()) as { deletedCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete polls.");
      }

      setMessage(`Deleted ${data.deletedCount ?? pollIds.length} poll(s).`);
      setSelectedPollIds((current) => current.filter((id) => !pollIds.includes(id)));
      setPolls((current) => current.filter((poll) => !pollIds.includes(poll.id)));

      if (editingPollId && pollIds.includes(editingPollId)) {
        cancelEditing();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete polls.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    await deletePolls(selectedPollIds);
  }

  return (
    <div className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Polls</div>
            <h2>Poll Manager</h2>
            <p className="page-copy admin-copy">{pollCountSummary}</p>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-button"
              onClick={() => setIsImportOpen((current) => !current)}
              type="button"
            >
              {isImportOpen ? "Hide Import" : "Import"}
            </button>
            <button className="secondary-button" onClick={() => void loadPolls()} type="button" disabled={isLoading}>
              Refresh
            </button>
            <button
              className="danger-button"
              onClick={() => void handleBulkDelete()}
              type="button"
              disabled={isDeleting || selectedPollIds.length === 0}
            >
              {isDeleting ? "Deleting..." : `Delete Selected (${selectedPollIds.length})`}
            </button>
          </div>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}

        {isImportOpen ? (
          <section className="builder-toolbar-shell">
            <div className="panel-label">CSV Import</div>
            <p className="page-copy admin-copy">
              Upload a CSV with `Category`, `Question`, `Option_A`, and `Option_B` columns, then review
              and clean up the imported polls below.
            </p>
            <CsvImportForm
              onImported={async () => {
                await loadPolls();
                setIsImportOpen(false);
              }}
            />
          </section>
        ) : null}

        <div className="polls-filter-grid">
          <label className="polls-filter-checkall">
            <span>Check all</span>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={filteredPolls.length === 0} />
          </label>
          <label className="field polls-filter-field">
            <span>Order</span>
            <input
              type="text"
              value={filters.order}
              onChange={(event) => setFilters((current) => ({ ...current, order: event.target.value }))}
              placeholder="Filter order"
            />
          </label>
          <label className="field polls-filter-field">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">All categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field polls-filter-field">
            <span>Question</span>
            <input
              type="text"
              value={filters.question}
              onChange={(event) => setFilters((current) => ({ ...current, question: event.target.value }))}
              placeholder="Filter question"
            />
          </label>
          <label className="field polls-filter-field">
            <span>Options</span>
            <input
              type="text"
              value={filters.options}
              onChange={(event) => setFilters((current) => ({ ...current, options: event.target.value }))}
              placeholder="Filter options"
            />
          </label>
          <label className="field polls-filter-field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as PollFilterState["status"]
                }))
              }
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>

        <div className="table-shell">
          <table className="polls-table">
            <thead>
              <tr>
                <th className="checkbox-cell" aria-label="Select rows" />
                <th>Order</th>
                <th>Category</th>
                <th>Question</th>
                <th>Options</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolls.map((poll) => {
                const isEditing = editingPollId === poll.id && draft;

                return (
                  <tr key={poll.id}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedPollIds.includes(poll.id)}
                        onChange={() => togglePollSelection(poll.id)}
                      />
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="polls-inline-input polls-inline-order"
                          type="number"
                          value={draft.order_index}
                          onChange={(event) => updateDraft("order_index", event.target.value)}
                        />
                      ) : (
                        poll.order_index
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="polls-inline-input"
                          value={draft.category}
                          onChange={(event) => updateDraft("category", event.target.value)}
                        >
                          <option value="">Uncategorized</option>
                          {availableCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      ) : (
                        poll.category ?? "Uncategorized"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <textarea
                          className="builder-textarea polls-inline-textarea"
                          value={draft.question}
                          onChange={(event) => updateDraft("question", event.target.value)}
                        />
                      ) : (
                        poll.question
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="polls-options-editor">
                          {draft.poll_options.map((option, index) => (
                            <textarea
                              key={option.id}
                              className="builder-textarea polls-inline-textarea polls-option-textarea"
                              value={option.label}
                              onChange={(event) => updateDraftOption(option.id, event.target.value)}
                              aria-label={`Option ${index + 1}`}
                            />
                          ))}
                        </div>
                      ) : (
                        poll.poll_options.map((option) => option.label).join(" / ")
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="polls-inline-input"
                          value={draft.is_published ? "published" : "draft"}
                          onChange={(event) => updateDraft("is_published", event.target.value === "published")}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      ) : poll.is_published ? (
                        "Published"
                      ) : (
                        "Draft"
                      )}
                    </td>
                    <td>
                      <div className="polls-row-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="polls-icon-button"
                              onClick={() => void savePoll(poll.id)}
                              type="button"
                              disabled={isSaving}
                              aria-label="Save poll"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              className="polls-icon-button"
                              onClick={cancelEditing}
                              type="button"
                              disabled={isSaving}
                              aria-label="Cancel editing"
                              title="Cancel"
                            >
                              ↺
                            </button>
                          </>
                        ) : (
                          <button
                            className="polls-icon-button"
                            onClick={() => startEditing(poll)}
                            type="button"
                            aria-label="Edit poll"
                            title="Edit"
                          >
                            ✎
                          </button>
                        )}
                        <button
                          className="polls-icon-button polls-icon-button-danger"
                          onClick={() => void deletePolls([poll.id])}
                          type="button"
                          disabled={isDeleting}
                          aria-label="Delete poll"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPolls.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    No polls found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
