"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type { GameScoringRule } from "@/lib/game-admin";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";
import {
  SCORING_TABLE_COLUMNS,
  compareScoringRules,
  createScoringRuleDraft,
  scoringRuleToDraft,
  type ScoringRuleDraft,
  type ScoringRuleSortKey,
  type SortDirection
} from "./helpers";
import { AdminTableSortButton } from "./table-sort-button";
import { ScoringRuleEditor } from "./scoring-rule-editor";

type ScoringSectionProps = {
  scoringRules: GameScoringRule[];
  setScoringRules: Dispatch<SetStateAction<GameScoringRule[]>>;
  isLoading: boolean;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

export function ScoringSection({
  scoringRules,
  setScoringRules,
  isLoading,
  isSaving,
  setIsSaving,
  setError,
  setMessage
}: ScoringSectionProps) {
  const [editingScoringRuleId, setEditingScoringRuleId] = useState("");
  const [scoringRuleDraft, setScoringRuleDraft] = useState<ScoringRuleDraft>(createScoringRuleDraft());
  const [scoringRuleSortKey, setScoringRuleSortKey] = useState<ScoringRuleSortKey>("updatedAt");
  const [scoringRuleSortDirection, setScoringRuleSortDirection] = useState<SortDirection>("desc");
  const [scoringRuleQuery, setScoringRuleQuery] = useState("");
  const [scoringRuleMinPoints, setScoringRuleMinPoints] = useState("");
  const [scoringRuleMaxPoints, setScoringRuleMaxPoints] = useState("");

  const filteredScoringRules = useMemo(() => {
    const query = scoringRuleQuery.trim().toLowerCase();
    const minPoints = Number.parseInt(scoringRuleMinPoints, 10);
    const maxPoints = Number.parseInt(scoringRuleMaxPoints, 10);
    const hasMinPoints = Number.isFinite(minPoints);
    const hasMaxPoints = Number.isFinite(maxPoints);

    return scoringRules.filter((scoringRule) => {
      if (hasMinPoints && scoringRule.points < minPoints) {
        return false;
      }

      if (hasMaxPoints && scoringRule.points > maxPoints) {
        return false;
      }

      if (query) {
        const haystack = [scoringRule.scoreName, scoringRule.description, scoringRule.specificCriteria]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [scoringRuleMaxPoints, scoringRuleMinPoints, scoringRuleQuery, scoringRules]);

  const sortedScoringRules = useMemo(
    () =>
      [...filteredScoringRules].sort((left, right) =>
        compareScoringRules(left, right, scoringRuleSortKey, scoringRuleSortDirection)
      ),
    [filteredScoringRules, scoringRuleSortDirection, scoringRuleSortKey]
  );

  const hasScoringRuleFilters = Boolean(
    scoringRuleQuery.trim() || scoringRuleMinPoints.trim() || scoringRuleMaxPoints.trim()
  );

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function handleScoringRuleSort(nextKey: ScoringRuleSortKey) {
    if (scoringRuleSortKey === nextKey) {
      setScoringRuleSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setScoringRuleSortKey(nextKey);
    setScoringRuleSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  function startNewScoringRule() {
    resetMessages();
    setEditingScoringRuleId("new");
    setScoringRuleDraft(createScoringRuleDraft());
  }

  async function saveScoringRule() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        scoringRuleDraft.id ? `/api/admin/game/scoring/${scoringRuleDraft.id}` : "/api/admin/game/scoring",
        {
          method: scoringRuleDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreName: scoringRuleDraft.scoreName,
            description: scoringRuleDraft.description,
            specificCriteria: scoringRuleDraft.specificCriteria,
            points: scoringRuleDraft.points
          })
        }
      );
      const data = await readAdminJson<{ scoringRule?: GameScoringRule; error?: string }>(
        response,
        "Failed to save scoring rule."
      );

      if (!data.scoringRule) {
        throw new Error(data.error ?? "Failed to save scoring rule.");
      }

      setScoringRules((current) =>
        scoringRuleDraft.id
          ? current.map((item) => (item.id === data.scoringRule!.id ? data.scoringRule! : item))
          : [data.scoringRule!, ...current]
      );
      setMessage(`Saved scoring rule "${data.scoringRule.scoreName}".`);
      setEditingScoringRuleId("");
      setScoringRuleDraft(createScoringRuleDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save scoring rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteScoringRule(scoringRule: GameScoringRule) {
    if (!window.confirm(`Delete scoring rule "${scoringRule.scoreName}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/scoring/${scoringRule.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete scoring rule.");
      setScoringRules((current) => current.filter((item) => item.id !== scoringRule.id));
      setMessage(`Deleted scoring rule "${scoringRule.scoreName}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete scoring rule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <div>
          <div className="panel-label">Scoring</div>
          <h2>Point Scoring Rules</h2>
        </div>
        <button className="submit-button" disabled={isSaving} onClick={startNewScoringRule} type="button">
          New Scoring Rule
        </button>
      </div>
      {editingScoringRuleId === "new" ? (
        <ScoringRuleEditor
          draft={scoringRuleDraft}
          isSaving={isSaving}
          onCancel={() => setEditingScoringRuleId("")}
          onChange={setScoringRuleDraft}
          onSave={() => void saveScoringRule()}
        />
      ) : null}
      <div className="admin-products-filter-bar admin-game-filter-bar">
        <label className="field">
          <span>Score name or criteria</span>
          <input
            type="search"
            value={scoringRuleQuery}
            onChange={(event) => setScoringRuleQuery(event.target.value)}
            placeholder="Filter scoring rules"
          />
        </label>
        <label className="field">
          <span>Min points</span>
          <input
            min="0"
            type="number"
            value={scoringRuleMinPoints}
            onChange={(event) => setScoringRuleMinPoints(event.target.value)}
            placeholder="Any"
          />
        </label>
        <label className="field">
          <span>Max points</span>
          <input
            min="0"
            type="number"
            value={scoringRuleMaxPoints}
            onChange={(event) => setScoringRuleMaxPoints(event.target.value)}
            placeholder="Any"
          />
        </label>
      </div>
      {hasScoringRuleFilters ? (
        <p className="admin-products-filter-summary">
          Showing {sortedScoringRules.length} of {scoringRules.length} scoring rules
        </p>
      ) : null}
      <div className="table-shell builder-templates-shell">
        <table className="polls-table builder-templates-table">
          <thead>
            <tr>
              {SCORING_TABLE_COLUMNS.map((column) => (
                <th key={column.key}>
                  <AdminTableSortButton
                    activeSortKey={scoringRuleSortKey}
                    label={column.label}
                    onSort={handleScoringRuleSort}
                    sortDirection={scoringRuleSortDirection}
                    sortKey={column.key}
                  />
                </th>
              ))}
              <th className="crud-actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedScoringRules.map((scoringRule) => (
              <tr key={scoringRule.id}>
                <td><strong>{scoringRule.scoreName}</strong></td>
                <td>{scoringRule.description || <span className="admin-table-empty">None</span>}</td>
                <td>{scoringRule.specificCriteria || <span className="admin-table-empty">None</span>}</td>
                <td>{scoringRule.points}</td>
                <td>{formatTemplateTimestamp(scoringRule.updatedAt)}</td>
                <td className="crud-actions-cell">
                  <div className="table-actions">
                    <button
                      aria-label="Edit scoring rule"
                      className="polls-icon-button polls-icon-button-edit"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingScoringRuleId(scoringRule.id);
                        setScoringRuleDraft(scoringRuleToDraft(scoringRule));
                      }}
                      title="Edit"
                      type="button"
                    >
                      ✎
                    </button>
                    <button
                      aria-label="Delete scoring rule"
                      className="polls-icon-button polls-icon-button-danger"
                      disabled={isSaving}
                      onClick={() => void deleteScoringRule(scoringRule)}
                      title="Delete"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedScoringRules.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={6}>
                  {isLoading
                    ? "Loading scoring rules..."
                    : scoringRules.length === 0
                      ? "No scoring rules found."
                      : "No scoring rules match the current filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editingScoringRuleId && editingScoringRuleId !== "new" ? (
        <ScoringRuleEditor
          draft={scoringRuleDraft}
          isSaving={isSaving}
          onCancel={() => setEditingScoringRuleId("")}
          onChange={setScoringRuleDraft}
          onSave={() => void saveScoringRule()}
        />
      ) : null}
    </section>
  );
}
