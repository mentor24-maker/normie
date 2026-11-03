"use client";

import { useEffect, useState } from "react";

type RepairCandidate = {
  id: string;
  orderIndex: number;
  currentQuestion: string;
  derivedCategory: string;
  derivedQuestion: string;
  currentOptionCount: number;
  remainingOptionCount: number;
};

export function AdminPollRepairPanel({ onRepaired }: { onRepaired?: () => Promise<void> | void }) {
  const [candidates, setCandidates] = useState<RepairCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch worker with no synchronous setState: the mount effect can call it
  // directly (isLoading starts true), event handlers go through
  // refreshCandidates so they still flip the loading state.
  async function loadCandidates() {
    try {
      const response = await fetch("/api/admin/polls/repair", { cache: "no-store" });
      const data = (await response.json()) as { candidates?: RepairCandidate[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to inspect legacy poll structure.");
      }

      setCandidates(data.candidates ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to inspect legacy poll structure."
      );
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }

  function refreshCandidates() {
    setIsLoading(true);
    setError(null);
    return loadCandidates();
  }

  useEffect(() => {
    void loadCandidates();
  }, []);

  async function handleRepair() {
    const confirmed = window.confirm(
      `Repair ${candidates.length} legacy poll row(s)? This will move the current poll question into category, promote the first option into the actual question, and drop that first option from the answers.`
    );

    if (!confirmed) {
      return;
    }

    setIsRepairing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/polls/repair", { method: "POST" });
      const data = (await response.json()) as { repairedCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to repair legacy poll structure.");
      }

      setMessage(`Repaired ${data.repairedCount ?? 0} poll row(s).`);
      await refreshCandidates();
      await onRepaired?.();
    } catch (repairError) {
      setError(
        repairError instanceof Error ? repairError.message : "Failed to repair legacy poll structure."
      );
    } finally {
      setIsRepairing(false);
    }
  }

  if (isLoading && candidates.length === 0 && !error) {
    return null;
  }

  if (candidates.length === 0 && !error && !message) {
    return null;
  }

  return (
    <section className="admin-section">
      <div className="panel-label">Legacy Data Check</div>
      <h2>Poll structure repair</h2>
      <p className="page-copy admin-copy">
        The intended model is a linked poll category, with the actual prompt in
        `polls.question`, and only answer choices in `poll_options`. This tool detects the older
        malformed shape where the category landed in `question` and the real prompt became the first
        option.
      </p>

      {message ? <div className="notice success admin-notice">{message}</div> : null}
      {error ? <div className="notice error admin-notice">{error}</div> : null}

      {candidates.length > 0 ? (
        <>
          <div className="admin-actions">
            <button className="secondary-button" onClick={() => void refreshCandidates()} type="button" disabled={isLoading}>
              Refresh Check
            </button>
            <button className="submit-button" onClick={() => void handleRepair()} type="button" disabled={isRepairing}>
              {isRepairing ? "Repairing..." : `Repair ${candidates.length} Polls`}
            </button>
          </div>
          <div className="table-shell">
            <table className="polls-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Current `question`</th>
                  <th>Derived category</th>
                  <th>Derived real question</th>
                  <th>Answers after repair</th>
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 12).map((candidate) => (
                  <tr key={candidate.id}>
                    <td>{candidate.orderIndex}</td>
                    <td>{candidate.currentQuestion}</td>
                    <td>{candidate.derivedCategory}</td>
                    <td>{candidate.derivedQuestion}</td>
                    <td>{candidate.remainingOptionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
