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

export function AdminPollsManager() {
  const [adminKey, setAdminKey] = useState("");
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const allSelected =
    polls.length > 0 && selectedPollIds.length === polls.length;

  async function loadPolls() {
    if (!adminKey.trim()) {
      setPolls([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls", {
        headers: {
          "x-import-admin-key": adminKey
        },
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
    if (!adminKey.trim()) {
      return;
    }

    void loadPolls();
  }, [adminKey]);

  function togglePollSelection(pollId: string) {
    setSelectedPollIds((current) =>
      current.includes(pollId) ? current.filter((id) => id !== pollId) : [...current, pollId]
    );
  }

  function toggleSelectAll() {
    setSelectedPollIds(allSelected ? [] : polls.map((poll) => poll.id));
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
          "Content-Type": "application/json",
          "x-import-admin-key": adminKey
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
      await loadPolls();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete polls.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    await deletePolls(selectedPollIds);
  }

  const pollCountSummary = useMemo(() => {
    if (!adminKey.trim()) {
      return "Enter the admin key to load polls.";
    }

    if (isLoading) {
      return "Loading polls...";
    }

    return `${polls.length} poll${polls.length === 1 ? "" : "s"} loaded`;
  }, [adminKey, isLoading, polls.length]);

  return (
    <div className="admin-stack">
      <section className="admin-section">
        <div className="panel-label">CSV Import</div>
        <h2>Import poll questions from CSV</h2>
        <p className="page-copy admin-copy">
          Upload a CSV with `Category`, `Question`, `Option_A`, and `Option_B` columns. The same
          admin key below is also used to load and manage existing polls.
        </p>
        <CsvImportForm adminKey={adminKey} onAdminKeyChange={setAdminKey} onImported={loadPolls} />
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Poll Manager</div>
            <h2>All polls</h2>
            <p className="page-copy admin-copy">{pollCountSummary}</p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={() => void loadPolls()} type="button" disabled={isLoading || !adminKey.trim()}>
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

        <div className="table-shell">
          <table className="polls-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={polls.length === 0} />
                </th>
                <th>Order</th>
                <th>Category</th>
                <th>Question</th>
                <th>Options</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((poll) => (
                <tr key={poll.id}>
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
                  <td>{poll.poll_options.map((option) => option.label).join(" / ")}</td>
                  <td>{poll.is_published ? "Published" : "Draft"}</td>
                  <td>
                    <button
                      className="row-delete-button"
                      onClick={() => void deletePolls([poll.id])}
                      type="button"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {polls.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    {adminKey.trim() ? "No polls found." : "Enter the admin key above to load polls."}
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
