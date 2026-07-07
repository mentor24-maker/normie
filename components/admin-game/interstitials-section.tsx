"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type { GameInterstitial } from "@/lib/game-admin";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";
import {
  createInterstitialDraft,
  formatInterstitialStatus,
  formatInterstitialType,
  interstitialToDraft,
  type InterstitialDraft
} from "./helpers";
import { InterstitialEditor } from "./interstitial-editor";

type InterstitialsSectionProps = {
  interstitials: GameInterstitial[];
  setInterstitials: Dispatch<SetStateAction<GameInterstitial[]>>;
  isLoading: boolean;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

export function InterstitialsSection({
  interstitials,
  setInterstitials,
  isLoading,
  isSaving,
  setIsSaving,
  setError,
  setMessage
}: InterstitialsSectionProps) {
  const [editingInterstitialId, setEditingInterstitialId] = useState("");
  const [interstitialDraft, setInterstitialDraft] = useState<InterstitialDraft>(createInterstitialDraft());

  const sortedInterstitials = useMemo(
    () =>
      [...interstitials].sort(
        (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)
      ),
    [interstitials]
  );

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function startNewInterstitial() {
    resetMessages();
    setEditingInterstitialId("new");
    setInterstitialDraft(createInterstitialDraft());
  }

  async function saveInterstitial() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        interstitialDraft.id ? `/api/admin/game/interstitials/${interstitialDraft.id}` : "/api/admin/game/interstitials",
        {
          method: interstitialDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: interstitialDraft.name,
            description: interstitialDraft.description,
            interstitialType: interstitialDraft.interstitialType,
            displayOrder: interstitialDraft.displayOrder,
            status: interstitialDraft.status,
            metadata: interstitialDraft.metadata ?? {}
          })
        }
      );
      const data = await readAdminJson<{ interstitial?: GameInterstitial; error?: string }>(
        response,
        "Failed to save interstitial."
      );

      if (!data.interstitial) {
        throw new Error(data.error ?? "Failed to save interstitial.");
      }

      setInterstitials((current) =>
        interstitialDraft.id
          ? current.map((item) => (item.id === data.interstitial!.id ? data.interstitial! : item))
          : [...current, data.interstitial!].sort(
              (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)
            )
      );
      setMessage(`Saved interstitial "${data.interstitial.name}".`);
      setEditingInterstitialId("");
      setInterstitialDraft(createInterstitialDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save interstitial.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteInterstitial(interstitial: GameInterstitial) {
    if (!window.confirm(`Delete interstitial "${interstitial.name}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/interstitials/${interstitial.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete interstitial.");
      setInterstitials((current) => current.filter((item) => item.id !== interstitial.id));
      if (editingInterstitialId === interstitial.id) {
        setEditingInterstitialId("");
        setInterstitialDraft(createInterstitialDraft());
      }
      setMessage(`Deleted interstitial "${interstitial.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete interstitial.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <div>
          <div className="panel-label">Interstitials</div>
          <h2>Poll Panel Interstitials</h2>
          <p className="page-copy admin-copy">
            Configure messages that appear in the main polling panel between questions.
          </p>
        </div>
        <button className="submit-button" disabled={isSaving} onClick={startNewInterstitial} type="button">
          New Interstitial
        </button>
      </div>
      {editingInterstitialId === "new" ? (
        <InterstitialEditor
          draft={interstitialDraft}
          isSaving={isSaving}
          onCancel={() => setEditingInterstitialId("")}
          onChange={setInterstitialDraft}
          onSave={() => void saveInterstitial()}
        />
      ) : null}
      <div className="table-shell builder-templates-shell">
        <table className="polls-table builder-templates-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th className="crud-actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedInterstitials.map((interstitial) => (
              <tr key={interstitial.id}>
                <td>{interstitial.displayOrder}</td>
                <td><strong>{interstitial.name}</strong></td>
                <td>{formatInterstitialType(interstitial.interstitialType)}</td>
                <td>{formatInterstitialStatus(interstitial.status)}</td>
                <td>{formatTemplateTimestamp(interstitial.updatedAt)}</td>
                <td className="crud-actions-cell">
                  <div className="crud-actions">
                    <button
                      aria-label="Edit interstitial"
                      className="polls-icon-button polls-icon-button-edit"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingInterstitialId(interstitial.id);
                        setInterstitialDraft(interstitialToDraft(interstitial));
                      }}
                      title="Edit"
                      type="button"
                    >
                      ✎
                    </button>
                    <button
                      aria-label="Delete interstitial"
                      className="polls-icon-button polls-icon-button-danger"
                      disabled={isSaving}
                      onClick={() => void deleteInterstitial(interstitial)}
                      title="Delete"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedInterstitials.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={6}>
                  {isLoading ? "Loading interstitials..." : "No interstitials found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editingInterstitialId && editingInterstitialId !== "new" ? (
        <InterstitialEditor
          draft={interstitialDraft}
          isSaving={isSaving}
          onCancel={() => setEditingInterstitialId("")}
          onChange={setInterstitialDraft}
          onSave={() => void saveInterstitial()}
        />
      ) : null}
    </section>
  );
}
