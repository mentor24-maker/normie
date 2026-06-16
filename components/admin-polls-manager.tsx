"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  summarizeDeepDiveBlogPost,
  summarizeYoutube,
  type AdminBlogPostOption
} from "@/components/admin-poll-deep-dive-editor";
import { buildPublicPollViewPath, pollCategoriesEqual } from "@/lib/poll-categories";
import { sortPollCategoryNames } from "@/lib/load-poll-category-catalog";
import { usePollCategoryCatalog } from "@/lib/use-poll-category-catalog";
import { AdminPollResponsePurgePanel } from "@/components/admin-poll-response-purge-panel";
import { AdminPollUploadPod } from "@/components/admin-poll-upload-pod";
import { CsvImportForm } from "@/components/csv-import-form";
import { PersonalityCsvImportForm } from "@/components/personality-csv-import-form";
import {
  PERSONALITY_TYPE_A_COLUMNS,
  PERSONALITY_TYPE_B_COLUMNS,
  PERSONALITY_TYPE_C_COLUMNS
} from "@/lib/personality-poll-import";
import { POLL_COLLECTIONS, type PollCollection } from "@/lib/poll-collections";
import { POLL_TABLE_THUMB_WIDTH, resolvePollTableThumbnailSrc } from "@/lib/poll-table-thumbnail";
import { pollStatusLabel } from "@/lib/poll-visibility";

const STANDARD_UPLOAD_COLUMNS = ["Category", "Question", "Option_A", "Option_B"];

type PollOption = {
  id: string;
  label: string;
  sort_order: number;
};

type AdminPoll = {
  id: string;
  category: string | null;
  collection?: string | null;
  question: string;
  deep_dive?: string;
  deep_dive_youtube_url?: string;
  deep_dive_blog_post_id?: string | null;
  deep_dive_related_poll_ids?: unknown;
  image_url: string;
  gallery_linked?: boolean;
  order_index: number;
  created_at: string;
  is_published: boolean;
  is_hidden?: boolean;
  poll_options: PollOption[];
};

type PollMetrics = {
  questionCount: number;
  totalAnswers: number;
};

type PollFilterState = {
  collection: "" | PollCollection;
  category: string;
  question: string;
  status: "all" | "published" | "draft" | "hidden";
  not: boolean;
  requireYoutube: boolean;
  requireImage: boolean;
  requireBlogPost: boolean;
};

const emptyFilters: PollFilterState = {
  collection: "",
  category: "",
  question: "",
  status: "all",
  not: false,
  requireYoutube: false,
  requireImage: false,
  requireBlogPost: false
};

function matchesPollAttributeFilter(require: boolean, hasValue: boolean, invert: boolean): boolean {
  if (!require) {
    return true;
  }

  return invert ? !hasValue : hasValue;
}

function normalizePollFilters(filters: PollFilterState): PollFilterState {
  return {
    collection: filters.collection ?? "",
    category: filters.category ?? "",
    question: filters.question ?? "",
    status: filters.status ?? "all",
    not: filters.not === true,
    requireYoutube: filters.requireYoutube === true,
    requireImage: filters.requireImage === true,
    requireBlogPost: filters.requireBlogPost === true
  };
}

function formatPollCollection(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return POLL_COLLECTIONS.includes(normalized as PollCollection) ? normalized : "Standard";
}

function PollTableImageCell({ imageUrl }: { imageUrl: string }) {
  const src = resolvePollTableThumbnailSrc(imageUrl);

  if (!src) {
    return <span className="polls-table-image-empty">—</span>;
  }

  return (
    <img
      alt=""
      className="polls-table-image-thumb"
      height={POLL_TABLE_THUMB_WIDTH}
      loading="lazy"
      src={src}
      width={POLL_TABLE_THUMB_WIDTH}
    />
  );
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
  const [metrics, setMetrics] = useState<PollMetrics>({
    questionCount: 0,
    totalAnswers: 0
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<PollFilterState>(emptyFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ pollIds: string[] } | null>(null);
  const [deletePlayerRecords, setDeletePlayerRecords] = useState(true);
  const [isHiding, setIsHiding] = useState(false);
  const [blogPosts, setBlogPosts] = useState<AdminBlogPostOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPolls() {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls?sync_gallery_links=1", {
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

  const categoryFilterListId = useId();
  const { catalog: pollCategoryCatalog } = usePollCategoryCatalog();

  const availableCategories = useMemo(() => {
    return sortPollCategoryNames(pollCategoryCatalog.map((category) => category.name));
  }, [pollCategoryCatalog]);

  const activeFilters = useMemo(() => normalizePollFilters(filters), [filters]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const statusText = pollStatusLabel(poll).toLowerCase();
      const hasYoutube = (poll.deep_dive_youtube_url ?? "").trim().length > 0;
      const hasImage = poll.gallery_linked === true;
      const hasBlogPost = Boolean((poll.deep_dive_blog_post_id ?? "").toString().trim());

      return (
        (!activeFilters.collection || formatPollCollection(poll.collection) === activeFilters.collection) &&
        (!activeFilters.category || pollCategoriesEqual(poll.category, activeFilters.category)) &&
        matchesFilter(poll.question, activeFilters.question) &&
        (activeFilters.status === "all" || statusText === activeFilters.status) &&
        matchesPollAttributeFilter(activeFilters.requireYoutube, hasYoutube, activeFilters.not) &&
        matchesPollAttributeFilter(activeFilters.requireImage, hasImage, activeFilters.not) &&
        matchesPollAttributeFilter(activeFilters.requireBlogPost, hasBlogPost, activeFilters.not)
      );
    });
  }, [activeFilters, polls]);

  const allSelected =
    filteredPolls.length > 0 && filteredPolls.every((poll) => selectedPollIds.includes(poll.id));

  const pollCountSummary = useMemo(() => {
    if (isLoading) {
      return "Loading polls...";
    }

    const totalPolls = metrics.questionCount;

    if (filteredPolls.length === polls.length) {
      return `${totalPolls} poll${totalPolls === 1 ? "" : "s"} loaded`;
    }

    return `${filteredPolls.length} of ${totalPolls} polls shown`;
  }, [filteredPolls.length, isLoading, metrics.questionCount, polls.length]);

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

  function requestDeletePolls(pollIds: string[]) {
    if (pollIds.length === 0) {
      return;
    }

    setDeletePlayerRecords(true);
    setDeleteDialog({ pollIds });
  }

  async function confirmDeletePolls() {
    if (!deleteDialog) {
      return;
    }

    const pollIds = deleteDialog.pollIds;
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
          pollIds,
          deletePlayerRecords
        })
      });

      const data = (await response.json()) as {
        deletedCount?: number;
        deletedResponseCount?: number;
        deletedReactionCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete polls.");
      }

      const deletedCount = data.deletedCount ?? pollIds.length;
      const deletedResponseCount = data.deletedResponseCount ?? 0;
      const deletedReactionCount = data.deletedReactionCount ?? 0;
      const cleanupSummary =
        deletePlayerRecords && (deletedResponseCount > 0 || deletedReactionCount > 0)
          ? ` Removed ${deletedResponseCount} answer${deletedResponseCount === 1 ? "" : "s"} and ${deletedReactionCount} reaction${deletedReactionCount === 1 ? "" : "s"}.`
          : "";

      setMessage(`Deleted ${deletedCount} poll${deletedCount === 1 ? "" : "s"}.${cleanupSummary}`);
      setSelectedPollIds((current) => current.filter((id) => !pollIds.includes(id)));
      setPolls((current) => current.filter((poll) => !pollIds.includes(poll.id)));
      setMetrics((current) => ({
        ...current,
        questionCount: Math.max(0, current.questionCount - deletedCount)
      }));
      setDeleteDialog(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete polls.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function hideSelectedPolls() {
    if (selectedPollIds.length === 0) {
      return;
    }

    const hideIds = selectedPollIds.filter((id) => {
      const poll = polls.find((entry) => entry.id === id);
      return poll && !poll.is_hidden;
    });

    if (hideIds.length === 0) {
      setMessage("Selected polls are already hidden.");
      return;
    }

    setIsHiding(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pollIds: hideIds
        })
      });

      const data = (await response.json()) as { hiddenCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to hide polls.");
      }

      setMessage(`Hidden ${data.hiddenCount ?? hideIds.length} poll(s) from the public site and player portal.`);
      setPolls((current) =>
        current.map((poll) => (hideIds.includes(poll.id) ? { ...poll, is_hidden: true } : poll))
      );
    } catch (hideError) {
      setError(hideError instanceof Error ? hideError.message : "Failed to hide polls.");
    } finally {
      setIsHiding(false);
    }
  }

  return (
    <div className="admin-stack admin-polls-stack">
      <section className="admin-section admin-polls-workspace">
        <div className="admin-polls-header">
          <div className="panel-label admin-polls-eyebrow">Polls</div>

          <div className="admin-polls-title-row">
            <div className="admin-polls-heading-copy">
              <h2>Poll Manager</h2>
              <p className="page-copy admin-copy">{pollCountSummary}</p>
            </div>

            <div className="admin-polls-title-aside">
              <div className="admin-polls-action-bar admin-actions">
                <Link
                  className="submit-button admin-blog-add-button admin-polls-create-button"
                  href="/admin/polls/new"
                >
                  Create Poll
                </Link>
                <button
                  className={`secondary-button admin-polls-import-button${isImportOpen ? " admin-polls-import-button-is-open" : ""}`}
                  onClick={() => setIsImportOpen((current) => !current)}
                  type="button"
                >
                  {isImportOpen ? "Hide Import" : "Import"}
                </button>
                <button
                  className={`secondary-button admin-polls-purge-button${isPurgeOpen ? " admin-polls-purge-button-is-open" : ""}`}
                  onClick={() => setIsPurgeOpen((current) => !current)}
                  type="button"
                  aria-expanded={isPurgeOpen}
                >
                  {isPurgeOpen ? "Close" : "Purge"}
                </button>
                <Link className="secondary-button admin-polls-settings-button" href="/admin/polls/settings">
                  Settings
                </Link>
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
        </div>

      {message ? <div className="notice success admin-notice">{message}</div> : null}
      {deleteDialog ? (
        <section className="admin-section admin-polls-delete-dialog">
          <div className="panel-label">Confirm Delete</div>
          <h2>
            Delete {deleteDialog.pollIds.length} Poll{deleteDialog.pollIds.length === 1 ? "" : "s"}
          </h2>
          <p className="page-copy admin-copy">
            This permanently removes the selected poll{deleteDialog.pollIds.length === 1 ? "" : "s"} from Poll
            Manager. This cannot be undone.
          </p>
          <label className="admin-polls-delete-option">
            <input
              checked={deletePlayerRecords}
              onChange={(event) => setDeletePlayerRecords(event.target.checked)}
              type="checkbox"
            />
            <span>Delete Player Answers and Reactions</span>
          </label>
          <p className="admin-field-help">
            When checked, player answers and Like/Dislike reactions for these polls are removed so dashboard and
            leaderboard totals stay aligned. Leave unchecked only if you need to preserve player records without the
            poll.
          </p>
          <div className="admin-actions">
            <button
              className="secondary-button"
              disabled={isDeleting}
              onClick={() => setDeleteDialog(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="submit-button admin-save-button"
              disabled={isDeleting}
              onClick={() => void confirmDeletePolls()}
              type="button"
            >
              {isDeleting ? "Deleting..." : "Delete Polls"}
            </button>
          </div>
        </section>
      ) : null}
      {error ? <div className="notice error admin-notice">{error}</div> : null}

        {isPurgeOpen ? (
          <section className="admin-polls-purge-shell" aria-label="Stale poll response purge">
            <AdminPollResponsePurgePanel />
          </section>
        ) : null}

        {isImportOpen ? (
          <section className="admin-polls-import-shell" aria-label="Poll CSV import">
            <AdminPollUploadPod title="Standard Upload" columns={STANDARD_UPLOAD_COLUMNS}>
              <CsvImportForm
                submitLabel="Upload CSV"
                onImported={async () => {
                  await loadPolls();
                }}
              />
            </AdminPollUploadPod>
            <AdminPollUploadPod title="Personality Type A" columns={[...PERSONALITY_TYPE_A_COLUMNS]}>
              <PersonalityCsvImportForm
                endpoint="/api/admin/polls/import-personality-type-a"
                onImported={async () => {
                  await loadPolls();
                }}
              />
            </AdminPollUploadPod>
            <AdminPollUploadPod title="Personality Type B" columns={[...PERSONALITY_TYPE_B_COLUMNS]}>
              <PersonalityCsvImportForm
                endpoint="/api/admin/polls/import-personality-type-b"
                onImported={async () => {
                  await loadPolls();
                }}
              />
            </AdminPollUploadPod>
            <AdminPollUploadPod title="Personality Type C" columns={[...PERSONALITY_TYPE_C_COLUMNS]}>
              <PersonalityCsvImportForm
                endpoint="/api/admin/polls/import-personality-type-c"
                onImported={async () => {
                  await loadPolls();
                }}
              />
            </AdminPollUploadPod>
          </section>
        ) : null}

        <div className="polls-filter-grid admin-polls-filter-bar">
          <label className="polls-filter-select-all" aria-label="Select all visible polls">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={filteredPolls.length === 0} />
          </label>
          <div className="polls-filter-spacer polls-filter-spacer-image" aria-hidden />
          <label className="field polls-filter-field">
            <span>Collection</span>
            <select
              value={activeFilters.collection}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  collection: event.target.value as PollFilterState["collection"]
                }))
              }
            >
              <option value="">All collections</option>
              {POLL_COLLECTIONS.map((collection) => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </label>
          <label className="field polls-filter-field">
            <span>Category</span>
            <input
              aria-label="Filter by category"
              list={categoryFilterListId}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              placeholder="All categories"
              type="text"
              value={activeFilters.category}
            />
            <datalist id={categoryFilterListId}>
              {availableCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label className="field polls-filter-field">
            <span>Question</span>
            <input
              type="text"
              value={activeFilters.question}
              onChange={(event) => setFilters((current) => ({ ...current, question: event.target.value }))}
            />
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>NOT</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={activeFilters.not}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, not: event.target.checked }))
                }
              />
            </div>
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>YouTube</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={activeFilters.requireYoutube}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireYoutube: event.target.checked }))
                }
              />
            </div>
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>Image</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={activeFilters.requireImage}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireImage: event.target.checked }))
                }
              />
            </div>
          </label>
          <label className="field polls-filter-field polls-filter-checkbox-field">
            <span>Blog Post</span>
            <div className="polls-filter-checkbox-wrap">
              <input
                type="checkbox"
                checked={activeFilters.requireBlogPost}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireBlogPost: event.target.checked }))
                }
              />
            </div>
          </label>
          <label className="field polls-filter-field">
            <span>Status</span>
            <select
              value={activeFilters.status}
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
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>

        <div className="admin-polls-bulk-actions-bar">
          <button
            className="secondary-button"
            disabled={isHiding || selectedPollIds.length === 0}
            onClick={() => void hideSelectedPolls()}
            type="button"
          >
            {isHiding ? "Hiding..." : "Hide Selected"}
          </button>
          <button
            className="danger-button"
            disabled={isDeleting || selectedPollIds.length === 0}
            onClick={() => requestDeletePolls(selectedPollIds)}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>

        <div className="table-shell">
          <table className="polls-table">
            <thead>
              <tr>
                <th className="checkbox-cell" aria-label="Select rows" />
                <th className="polls-table-image-cell">Image</th>
                <th>Collection</th>
                <th>Category</th>
                <th>Question</th>
                <th>YouTube</th>
                <th>Blog Post</th>
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
                  <td className="polls-table-image-cell">
                    <PollTableImageCell imageUrl={poll.image_url} />
                  </td>
                  <td>{formatPollCollection(poll.collection)}</td>
                  <td>{poll.category ?? "Uncategorized"}</td>
                  <td>{poll.question}</td>
                  <td className="polls-summary-cell">{summarizeYoutube(poll.deep_dive_youtube_url ?? "")}</td>
                  <td className="polls-summary-cell">
                    {summarizeDeepDiveBlogPost(poll.deep_dive_blog_post_id ?? "", blogPosts)}
                  </td>
                  <td>{pollStatusLabel(poll)}</td>
                  <td className="polls-actions-cell">
                    <div className="polls-row-actions">
                      {poll.is_published && !poll.is_hidden ? (
                        <Link
                          className="polls-icon-button polls-icon-button-view"
                          href={buildPublicPollViewPath(poll)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open poll on home page"
                          title="View Poll"
                        >
                          <span aria-hidden="true">↗</span>
                        </Link>
                      ) : null}
                      <Link
                        className="polls-icon-button polls-icon-button-edit"
                        href={`/admin/polls/${poll.id}/edit`}
                        aria-label="Edit poll"
                      >
                        ✎
                      </Link>
                      <button
                        className="polls-icon-button polls-icon-button-danger polls-icon-button-delete"
                        onClick={() => requestDeletePolls([poll.id])}
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
                  <td className="empty-cell" colSpan={9}>
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
