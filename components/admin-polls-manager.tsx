"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  summarizeDeepDiveBlogPost,
  summarizeDeepDiveRelatedPolls,
  summarizeYoutube,
  type AdminBlogPostOption
} from "@/components/admin-poll-deep-dive-editor";
import { buildPublicPollViewPath } from "@/lib/poll-categories";
import { CsvImportForm } from "@/components/csv-import-form";
import { StarcasterCsvImportForm } from "@/components/starcaster-csv-import-form";
import { normalizeDeepDiveRelatedPollIds } from "@/lib/poll-deep-dive";

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

type PollMetrics = {
  questionCount: number;
  totalAnswers: number;
};

type PollFilterState = {
  order: string;
  category: string;
  question: string;
  options: string;
  status: "all" | "published" | "draft";
  requireYoutube: boolean;
  requireBlogPost: boolean;
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
  status: "all",
  requireYoutube: false,
  requireBlogPost: false
};

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
  const [metrics, setMetrics] = useState<PollMetrics>({
    questionCount: 0,
    totalAnswers: 0
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<PollFilterState>(emptyFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blogPosts, setBlogPosts] = useState<AdminBlogPostOption[]>([]);
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

      const data = (await response.json()) as {
        polls?: AdminPoll[];
        metrics?: Partial<PollMetrics>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load polls.");
      }

      setPolls(data.polls ?? []);
      setMetrics({
        questionCount: data.metrics?.questionCount ?? data.polls?.length ?? 0,
        totalAnswers: data.metrics?.totalAnswers ?? 0
      });
      setSelectedPollIds((current) => current.filter((id) => (data.polls ?? []).some((poll) => poll.id === id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load polls.");
      setPolls([]);
      setMetrics({ questionCount: 0, totalAnswers: 0 });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPolls();
  }, []);

  useEffect(() => {
    async function loadBlogPosts() {
      try {
        const response = await fetch("/api/admin/blog/posts", { cache: "no-store" });
        const data = (await response.json()) as {
          posts?: Array<{ id: string; title: string; status: string }>;
        };

        if (response.ok) {
          setBlogPosts(
            (data.posts ?? []).map((post) => ({
              id: post.id,
              title: post.title,
              status: post.status
            }))
          );
        }
      } catch {
        setBlogPosts([]);
      }
    }

    void loadBlogPosts();
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
      const hasYoutube = (poll.deep_dive_youtube_url ?? "").trim().length > 0;
      const hasBlogPost = Boolean((poll.deep_dive_blog_post_id ?? "").toString().trim());

      return (
        matchesFilter(poll.order_index, filters.order) &&
        (!filters.category || (poll.category ?? "") === filters.category) &&
        matchesFilter(poll.question, filters.question) &&
        matchesFilter(optionsText, filters.options) &&
        (filters.status === "all" || statusText === filters.status) &&
        (!filters.requireYoutube || hasYoutube) &&
        (!filters.requireBlogPost || hasBlogPost)
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
    <div className="admin-stack admin-polls-stack">
      <section className="admin-section admin-polls-workspace">
        <div className="admin-polls-header">
          <div className="admin-polls-eyebrow-row">
            <div className="panel-label">Polls</div>
            <div className="admin-polls-action-bar admin-actions">
              <Link className="submit-button admin-blog-add-button" href="/admin/polls/new">
                Create Poll
              </Link>
              <button
                className="secondary-button admin-polls-import-button"
                onClick={() => setIsImportOpen((current) => !current)}
                type="button"
              >
                {isImportOpen ? "Hide Import" : "Import"}
              </button>
              <Link className="secondary-button admin-polls-settings-button" href="/admin/polls/settings">
                Settings
              </Link>
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

          <div className="admin-polls-heading-row">
            <div className="admin-polls-heading-copy">
              <h2>Poll Manager</h2>
              <p className="page-copy admin-copy">{pollCountSummary}</p>
            </div>
            <div className="admin-polls-metrics" aria-label="Key poll metrics">
              <article className="scalar-metric-pod admin-polls-metric-card admin-polls-metric-card-sky">
                <span className="scalar-metric-pod-label admin-polls-metric-label">Questions</span>
                <strong className="scalar-metric-pod-value admin-polls-metric-value">
                  {isLoading ? "—" : metrics.questionCount}
                </strong>
              </article>
              <article className="scalar-metric-pod admin-polls-metric-card admin-polls-metric-card-mint">
                <span className="scalar-metric-pod-label admin-polls-metric-label">Answers</span>
                <strong className="scalar-metric-pod-value admin-polls-metric-value">
                  {isLoading ? "—" : metrics.totalAnswers}
                </strong>
              </article>
            </div>
          </div>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}

        {isImportOpen ? (
          <section className="builder-toolbar-shell">
            <div className="panel-label">Starcaster Import</div>
            <p className="page-copy admin-copy">
              Upload the Normie 200 Would You Rather scoring CSV (`Category B`, `Option 1`, `Option B`,
              `Question`, and scoring columns). Use this form only — not the simple CSV layout below.
              If import fails, open Import Diagnostics for header details.
            </p>
            <StarcasterCsvImportForm
              onImported={async () => {
                await loadPolls();
                setIsImportOpen(false);
              }}
            />
            <div className="panel-label">Simple CSV Import</div>
            <p className="page-copy admin-copy">
              For basic polls only: `Category`, `Question`, `Option_A`, and `Option_B` — not the
              Starcaster scoring file.
            </p>
            <CsvImportForm
              onImported={async () => {
                await loadPolls();
                setIsImportOpen(false);
              }}
            />
          </section>
        ) : null}

        <div className="polls-filter-grid admin-polls-filter-bar">
          <label className="polls-filter-select-all" aria-label="Select all visible polls">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={filteredPolls.length === 0} />
          </label>
          <label className="field polls-filter-field">
            <span>Order</span>
            <input
              type="text"
              value={filters.order}
              onChange={(event) => setFilters((current) => ({ ...current, order: event.target.value }))}
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
            />
          </label>
          <div className="polls-filter-spacer polls-filter-spacer-image" aria-hidden />
          <label className="field polls-filter-field">
            <span>Options</span>
            <input
              type="text"
              value={filters.options}
              onChange={(event) => setFilters((current) => ({ ...current, options: event.target.value }))}
            />
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>YouTube</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={filters.requireYoutube}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireYoutube: event.target.checked }))
                }
              />
            </div>
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>Blog Post</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={filters.requireBlogPost}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireBlogPost: event.target.checked }))
                }
              />
            </div>
          </label>
          <div className="polls-filter-spacer polls-filter-spacer-related" aria-hidden />
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
          <div className="polls-filter-spacer polls-filter-spacer-actions" aria-hidden />
        </div>

        <div className="table-shell">
          <table className="polls-table">
            <thead>
              <tr>
                <th className="checkbox-cell" aria-label="Select rows" />
                <th>Order</th>
                <th>Category</th>
                <th>Question</th>
                <th>Image</th>
                <th>Options</th>
                <th>YouTube</th>
                <th>Blog Post</th>
                <th>Related Polls</th>
                <th>Status</th>
                <th className="polls-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolls.map((poll) => (
                <tr className="polls-table-row" key={poll.id}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedPollIds.includes(poll.id)}
                      onChange={() => togglePollSelection(poll.id)}
                    />
                  </td>
                  <td>{poll.order_index}</td>
                  <td>{poll.category ?? "Uncategorized"}</td>
                  <td>{poll.question}</td>
                  <td>{poll.image_url ? <code>{poll.image_url}</code> : "None"}</td>
                  <td>{poll.poll_options.map((option) => option.label).join(" / ")}</td>
                  <td className="polls-summary-cell">{summarizeYoutube(poll.deep_dive_youtube_url ?? "")}</td>
                  <td className="polls-summary-cell">
                    {summarizeDeepDiveBlogPost(poll.deep_dive_blog_post_id ?? "", blogPosts)}
                  </td>
                  <td className="polls-summary-cell">
                    {summarizeDeepDiveRelatedPolls(
                      normalizeDeepDiveRelatedPollIds(poll.deep_dive_related_poll_ids).length
                    )}
                  </td>
                  <td>{poll.is_published ? "Published" : "Draft"}</td>
                  <td className="polls-actions-cell">
                    <div className="polls-row-actions">
                      <Link
                        className="polls-icon-button polls-icon-button-view"
                        href={buildPublicPollViewPath(poll)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View poll on site"
                      >
                        <span aria-hidden="true" className="polls-icon-glyph-eye" />
                      </Link>
                      <Link
                        className="polls-icon-button polls-icon-button-edit"
                        href={`/admin/polls/${poll.id}/edit`}
                        aria-label="Edit poll"
                      >
                        ✎
                      </Link>
                      <button
                        className="polls-icon-button polls-icon-button-danger polls-icon-button-delete"
                        onClick={() => void deletePolls([poll.id])}
                        type="button"
                        disabled={isDeleting}
                        aria-label="Delete poll"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPolls.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={11}>
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
