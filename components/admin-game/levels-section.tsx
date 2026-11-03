"use client";

import { useMemo, useState, type DragEvent, type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import { GAME_LEVEL_NAMES } from "@/lib/game-admin";
import type { GameLevel, GameLevelName } from "@/lib/game-admin";
import {
  GAME_LEVEL_TABLE_COLUMNS,
  compareGameLevels,
  createGameLevelDraft,
  formatGameLevelName,
  formatSublevels,
  gameLevelToDraft,
  reorderItems,
  type GameLevelDraft,
  type GameLevelSortKey,
  type SortDirection
} from "./helpers";
import { AdminTableSortButton } from "./table-sort-button";
import { GameLevelEditor } from "./level-editors";

type LevelsSectionProps = {
  gameLevels: GameLevel[];
  setGameLevels: Dispatch<SetStateAction<GameLevel[]>>;
  isLoading: boolean;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

export function LevelsSection({
  gameLevels,
  setGameLevels,
  isLoading,
  isSaving,
  setIsSaving,
  setError,
  setMessage
}: LevelsSectionProps) {
  const [editingGameLevelId, setEditingGameLevelId] = useState("");
  const [gameLevelDraft, setGameLevelDraft] = useState<GameLevelDraft>(createGameLevelDraft());
  const [gameLevelSortKey, setGameLevelSortKey] = useState<GameLevelSortKey>("levelOrder");
  const [gameLevelSortDirection, setGameLevelSortDirection] = useState<SortDirection>("asc");
  const [gameLevelNameFilter, setGameLevelNameFilter] = useState<"" | GameLevelName>("");
  const [gameLevelOrderFilter, setGameLevelOrderFilter] = useState("");
  const [gameLevelQuery, setGameLevelQuery] = useState("");
  const [draggedGameLevelId, setDraggedGameLevelId] = useState<string | null>(null);

  const filteredGameLevels = useMemo(() => {
    const orderValue = Number.parseInt(gameLevelOrderFilter, 10);
    const hasOrderFilter = Number.isFinite(orderValue);
    const query = gameLevelQuery.trim().toLowerCase();

    return gameLevels.filter((gameLevel) => {
      if (gameLevelNameFilter && gameLevel.levelName !== gameLevelNameFilter) {
        return false;
      }

      if (hasOrderFilter && gameLevel.levelOrder !== orderValue) {
        return false;
      }

      if (query) {
        const haystack = [gameLevel.levelName, formatSublevels(gameLevel.sublevels)]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [gameLevelNameFilter, gameLevelOrderFilter, gameLevelQuery, gameLevels]);

  const sortedGameLevels = useMemo(
    () => [...filteredGameLevels].sort((left, right) => compareGameLevels(left, right, gameLevelSortKey, gameLevelSortDirection)),
    [filteredGameLevels, gameLevelSortDirection, gameLevelSortKey]
  );

  const hasGameLevelFilters = Boolean(gameLevelNameFilter || gameLevelOrderFilter.trim() || gameLevelQuery.trim());

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function handleGameLevelSort(nextKey: GameLevelSortKey) {
    if (gameLevelSortKey === nextKey) {
      setGameLevelSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setGameLevelSortKey(nextKey);
    setGameLevelSortDirection("asc");
  }

  function startNewGameLevel() {
    resetMessages();
    setEditingGameLevelId("new");
    setGameLevelDraft(createGameLevelDraft());
  }

  async function saveGameLevel() {
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        gameLevelDraft.id ? `/api/admin/game/levels/${gameLevelDraft.id}` : "/api/admin/game/levels",
        {
          method: gameLevelDraft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            levelName: gameLevelDraft.levelName,
            levelOrder: gameLevelDraft.levelOrder,
            sublevels: gameLevelDraft.sublevels ?? []
          })
        }
      );
      const data = await readAdminJson<{ gameLevel?: GameLevel; error?: string }>(
        response,
        "Failed to save progression track."
      );

      if (!data.gameLevel) {
        throw new Error(data.error ?? "Failed to save progression track.");
      }

      setGameLevels((current) =>
        gameLevelDraft.id
          ? current.map((item) => (item.id === data.gameLevel!.id ? data.gameLevel! : item))
          : [...current, data.gameLevel!]
      );
      setMessage(`Saved ${formatGameLevelName(data.gameLevel.levelName)}.`);
      setEditingGameLevelId("");
      setGameLevelDraft(createGameLevelDraft());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save progression track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGameLevel(gameLevel: GameLevel) {
    if (!window.confirm(`Delete ${formatGameLevelName(gameLevel.levelName)} order ${gameLevel.levelOrder}?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/levels/${gameLevel.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete progression track.");
      setGameLevels((current) => current.filter((item) => item.id !== gameLevel.id));
      setMessage(`Deleted ${formatGameLevelName(gameLevel.levelName)}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete progression track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function persistGameLevelOrder(nextLevels: GameLevel[]) {
    setIsSaving(true);
    resetMessages();

    try {
      const orderedLevels = nextLevels
        .slice()
        .sort((left, right) => left.levelOrder - right.levelOrder)
        .map((gameLevel, index) => ({ ...gameLevel, levelOrder: index + 1 }));
      const response = await fetch("/api/admin/game/levels/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levels: orderedLevels.map((gameLevel) => ({
            id: gameLevel.id,
            levelOrder: gameLevel.levelOrder
          }))
        })
      });
      const data = await readAdminJson<{ gameLevels?: GameLevel[]; error?: string }>(
        response,
        "Failed to reorder progression tracks."
      );

      setGameLevels(data.gameLevels ?? orderedLevels);
      setGameLevelSortKey("levelOrder");
      setGameLevelSortDirection("asc");
      setMessage("Updated progression track order.");
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Failed to reorder progression tracks.");
    } finally {
      setIsSaving(false);
    }
  }

  function moveGameLevel(gameLevelId: string, direction: -1 | 1) {
    const orderedLevels = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder);
    const sourceIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === gameLevelId);
    const targetIndex = sourceIndex + direction;

    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= orderedLevels.length) {
      return;
    }

    void persistGameLevelOrder(reorderItems(orderedLevels, sourceIndex, targetIndex));
  }

  function handleGameLevelDragStart(event: DragEvent<HTMLTableRowElement>, gameLevelId: string) {
    event.dataTransfer.setData("application/normie-game-level-id", gameLevelId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedGameLevelId(gameLevelId);
  }

  function handleGameLevelDragOver(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleGameLevelDrop(event: DragEvent<HTMLTableRowElement>, targetGameLevelId: string) {
    event.preventDefault();
    const sourceGameLevelId = event.dataTransfer.getData("application/normie-game-level-id") || draggedGameLevelId;
    setDraggedGameLevelId(null);

    if (!sourceGameLevelId || sourceGameLevelId === targetGameLevelId) {
      return;
    }

    const orderedLevels = gameLevels.slice().sort((left, right) => left.levelOrder - right.levelOrder);
    const sourceIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === sourceGameLevelId);
    const targetIndex = orderedLevels.findIndex((gameLevel) => gameLevel.id === targetGameLevelId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    void persistGameLevelOrder(reorderItems(orderedLevels, sourceIndex, targetIndex));
  }

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <div>
          <div className="panel-label">Progression</div>
          <h2>Progression Tracks</h2>
        </div>
        <button className="submit-button" disabled={isSaving} onClick={startNewGameLevel} type="button">
          New Progression Track
        </button>
      </div>
      {editingGameLevelId === "new" ? (
        <GameLevelEditor
          draft={gameLevelDraft}
          isSaving={isSaving}
          onCancel={() => setEditingGameLevelId("")}
          onChange={setGameLevelDraft}
          onSave={() => void saveGameLevel()}
        />
      ) : null}
      <div className="admin-products-filter-bar admin-game-filter-bar">
        <label className="field">
          <span>Progression Track</span>
          <select
            value={gameLevelNameFilter}
            onChange={(event) => setGameLevelNameFilter(event.target.value as "" | GameLevelName)}
          >
            <option value="">All names</option>
            {GAME_LEVEL_NAMES.map((levelName) => (
              <option key={levelName} value={levelName}>{formatGameLevelName(levelName)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Track Order</span>
          <select
            value={gameLevelOrderFilter}
            onChange={(event) => setGameLevelOrderFilter(event.target.value)}
          >
            <option value="">All orders</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((levelOrder) => (
              <option key={levelOrder} value={levelOrder}>{levelOrder}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sublevels</span>
          <input
            type="search"
            value={gameLevelQuery}
            onChange={(event) => setGameLevelQuery(event.target.value)}
            placeholder="Filter sublevels"
          />
        </label>
      </div>
      {hasGameLevelFilters ? (
        <p className="admin-products-filter-summary">
          Showing {sortedGameLevels.length} of {gameLevels.length} progression tracks
        </p>
      ) : null}
      <div className="table-shell builder-templates-shell">
        <table className="polls-table builder-templates-table">
          <thead>
            <tr>
              {GAME_LEVEL_TABLE_COLUMNS.map((column) => (
                <th key={column.key}>
                  <AdminTableSortButton
                    activeSortKey={gameLevelSortKey}
                    label={column.label}
                    onSort={handleGameLevelSort}
                    sortDirection={gameLevelSortDirection}
                    sortKey={column.key}
                  />
                </th>
              ))}
              <th className="crud-actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedGameLevels.map((gameLevel) => {
              const orderedIndex = gameLevels
                .slice()
                .sort((left, right) => left.levelOrder - right.levelOrder)
                .findIndex((item) => item.id === gameLevel.id);

              return (
              <tr
                className={draggedGameLevelId === gameLevel.id ? "admin-game-draggable-row is-dragging" : "admin-game-draggable-row"}
                draggable
                key={gameLevel.id}
                onDragEnd={() => setDraggedGameLevelId(null)}
                onDragOver={handleGameLevelDragOver}
                onDragStart={(event) => handleGameLevelDragStart(event, gameLevel.id)}
                onDrop={(event) => handleGameLevelDrop(event, gameLevel.id)}
              >
                <td>
                  <div className="admin-game-level-name-cell">
                    <span className="admin-game-drag-handle" title="Drag to reorder">⋮⋮</span>
                    <strong>{formatGameLevelName(gameLevel.levelName)}</strong>
                  </div>
                </td>
                <td>
                  <div className="admin-game-order-cell">
                    <span>{gameLevel.levelOrder}</span>
                    <button
                      aria-label="Move progression track up"
                      className="polls-icon-button"
                      disabled={isSaving || orderedIndex <= 0}
                      onClick={() => moveGameLevel(gameLevel.id, -1)}
                      title="Move up"
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Move progression track down"
                      className="polls-icon-button"
                      disabled={isSaving || orderedIndex === gameLevels.length - 1}
                      onClick={() => moveGameLevel(gameLevel.id, 1)}
                      title="Move down"
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>
                  {gameLevel.sublevels.length
                    ? formatSublevels(gameLevel.sublevels)
                    : <span className="admin-table-empty">None</span>}
                </td>
                <td className="crud-actions-cell">
                  <div className="table-actions">
                    <button
                      aria-label="Edit progression track"
                      className="polls-icon-button polls-icon-button-edit"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingGameLevelId(gameLevel.id);
                        setGameLevelDraft(gameLevelToDraft(gameLevel));
                      }}
                      title="Edit"
                      type="button"
                    >
                      ✎
                    </button>
                    <button
                      aria-label="Delete progression track"
                      className="polls-icon-button polls-icon-button-danger"
                      disabled={isSaving}
                      onClick={() => void deleteGameLevel(gameLevel)}
                      title="Delete"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {sortedGameLevels.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={4}>
                  {isLoading
                    ? "Loading progression tracks..."
                    : gameLevels.length === 0
                      ? "No progression tracks found."
                      : "No progression tracks match the current filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editingGameLevelId && editingGameLevelId !== "new" ? (
        <GameLevelEditor
          draft={gameLevelDraft}
          isSaving={isSaving}
          onCancel={() => setEditingGameLevelId("")}
          onChange={setGameLevelDraft}
          onSave={() => void saveGameLevel()}
        />
      ) : null}
      <button
        aria-label="Add progression track"
        className="polls-icon-button polls-icon-button-success admin-game-add-after-list"
        disabled={isSaving}
        onClick={startNewGameLevel}
        title="Add progression track"
        type="button"
      >
        +
      </button>
    </section>
  );
}
