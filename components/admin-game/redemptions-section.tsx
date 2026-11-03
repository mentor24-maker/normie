"use client";

import { Fragment, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media";
import { GAME_REWARD_STATUSES, GAME_REWARD_TYPES } from "@/lib/game-admin";
import type { GameLevel, GameProgressiveFeature, GameReward, GameRewardStatus, GameRewardType } from "@/lib/game-admin";

import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";

import { REWARD_TABLE_COLUMNS, REWARD_TABLE_COLUMN_COUNT, buildBulkRewardColorMetadata, buildBulkRewardSingleSizeMetadata, compareRewards, createRewardDraft, getRewardSaveDiagnosticTone, getRewardTierValue, isRewardTierBulkAction, rewardToDraft, rewardToPayload, rewardTypeLabel, statusLabel, DEFAULT_BADGE_BACKGROUND_COLOR, type RewardBulkAction, type RewardDraft, type RewardSortKey, type SortDirection } from "./helpers";
import { AdminTableSortButton } from "./table-sort-button";
import { RewardEditor, RewardVisualSummary } from "./reward-editor";

type RedemptionsSectionProps = {
  rewards: GameReward[];
  setRewards: Dispatch<SetStateAction<GameReward[]>>;
  gameLevels: GameLevel[];
  progressiveFeatures: GameProgressiveFeature[];
  galleryMedia: AdminMediaItem[];
  loadGalleryMedia: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
};

export function RedemptionsSection({
  rewards,
  setRewards,
  gameLevels,
  progressiveFeatures,
  galleryMedia,
  loadGalleryMedia,
  isLoading,
  isSaving,
  setIsSaving,
  setError,
  setMessage
}: RedemptionsSectionProps) {
  const [editingRewardId, setEditingRewardId] = useState("");
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(createRewardDraft());
  const [rewardSortKey, setRewardSortKey] = useState<RewardSortKey>("levelTier");
  const [rewardSortDirection, setRewardSortDirection] = useState<SortDirection>("asc");
  const [rewardQuery, setRewardQuery] = useState("");
  const [rewardTypeFilter, setRewardTypeFilter] = useState<"" | GameRewardType>("");
  const [rewardStatusFilter, setRewardStatusFilter] = useState<"" | GameRewardStatus>("");
  const [rewardLevelFilter, setRewardLevelFilter] = useState("");
  const [rewardGradeFilter, setRewardGradeFilter] = useState("");
  const [rewardClassFilter, setRewardClassFilter] = useState("");
  const [rawSelectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);
  const [rewardBulkAction, setRewardBulkAction] = useState<RewardBulkAction>("levelTier");
  const [bulkPollVisualSize, setBulkPollVisualSize] = useState("20px");
  const [bulkLevelVisualSize, setBulkLevelVisualSize] = useState("42px");
  const [bulkRewardVisualColor, setBulkRewardVisualColor] = useState(DEFAULT_BADGE_BACKGROUND_COLOR);
  const [rewardSaveDiagnostic, setRewardSaveDiagnostic] = useState<string | null>(null);

  // Selection is derived against the current reward list, so ids for deleted
  // rewards drop out without any state pruning.
  const selectedRewardIds = useMemo(
    () => rawSelectedRewardIds.filter((id) => rewards.some((reward) => reward.id === id)),
    [rawSelectedRewardIds, rewards]
  );

  const hasRewardFilters = Boolean(
    rewardQuery.trim() ||
    rewardTypeFilter ||
    rewardStatusFilter ||
    rewardLevelFilter ||
    rewardGradeFilter ||
    rewardClassFilter
  );

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  function handleRewardSort(nextKey: RewardSortKey) {
    if (rewardSortKey === nextKey) {
      setRewardSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setRewardSortKey(nextKey);
    setRewardSortDirection("asc");
  }

  function startNewReward() {
    resetMessages();
    setEditingRewardId("new");
    setRewardDraft(createRewardDraft());
  }

  async function saveReward() {
    setIsSaving(true);
    resetMessages();
    setRewardSaveDiagnostic("Saving reward...");

    try {
      const payload = rewardToPayload(rewardDraft);
      const response = await fetch(rewardDraft.id ? `/api/admin/game/rewards/${rewardDraft.id}` : "/api/admin/game/rewards", {
        method: rewardDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setRewardSaveDiagnostic(
        `POST /api/admin/game/rewards returned ${response.status}. Type=${payload.rewardType ?? "(blank)"}, Status=${payload.status ?? "(blank)"}.`
      );
      const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to save reward.");

      if (!data.reward) {
        throw new Error(data.error ?? "Failed to save reward.");
      }

      setRewards((current) =>
        rewardDraft.id ? current.map((item) => (item.id === data.reward!.id ? data.reward! : item)) : [data.reward!, ...current]
      );
      setMessage(`Saved reward "${data.reward.name}".`);
      setRewardSaveDiagnostic(`Saved reward "${data.reward.name}" (${data.reward.id}).`);
      setEditingRewardId("");
      setRewardDraft(createRewardDraft());
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : "Failed to save reward.";
      setRewardSaveDiagnostic(`Reward save failed: ${saveMessage}`);
      setError(saveMessage);
    } finally {
      setIsSaving(false);
    }
  }

  async function cloneReward(reward: GameReward) {
    setIsSaving(true);
    resetMessages();
    setRewardSaveDiagnostic(`Cloning reward "${reward.name}"...`);

    try {
      const payload = rewardToPayload(reward, {
        name: `${reward.name} (copy)`,
        status: reward.status
      });
      const response = await fetch("/api/admin/game/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to clone reward.");

      if (!data.reward) {
        throw new Error(data.error ?? "Failed to clone reward.");
      }

      setRewards((current) => [data.reward!, ...current]);
      setMessage(`Cloned reward "${reward.name}".`);
      setRewardSaveDiagnostic(`Cloned reward as "${data.reward.name}" (${data.reward.id}).`);
      setEditingRewardId("");
      setRewardDraft(createRewardDraft());
    } catch (cloneError) {
      const cloneMessage = cloneError instanceof Error ? cloneError.message : "Failed to clone reward.";
      setRewardSaveDiagnostic(`Reward clone failed: ${cloneMessage}`);
      setError(cloneMessage);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleRewardSelection(rewardId: string, checked: boolean) {
    setSelectedRewardIds((current) => {
      if (checked) {
        return current.includes(rewardId) ? current : [...current, rewardId];
      }

      return current.filter((id) => id !== rewardId);
    });
  }

  function toggleAllVisibleRewards(checked: boolean) {
    if (!checked) {
      setSelectedRewardIds((current) => current.filter((id) => !sortedRewards.some((reward) => reward.id === id)));
      return;
    }

    const visibleIds = sortedRewards.map((reward) => reward.id);
    setSelectedRewardIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function copySelectedRewardsToNextTier() {
    if (!isRewardTierBulkAction(rewardBulkAction)) {
      return;
    }

    const tierTarget = rewardBulkAction;
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to copy.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic("Copying selected rewards...");

    try {
      const createdRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const currentTierValue = getRewardTierValue(reward, tierTarget);
        const payload = rewardToPayload(reward, {
          metadata: {
            ...reward.metadata,
            [tierTarget]: currentTierValue + 1
          }
        });

        const response = await fetch("/api/admin/game/rewards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to copy rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to copy rewards.");
        }

        createdRewards.push(data.reward);
      }

      setRewards((current) => [...createdRewards, ...current]);
      setSelectedRewardIds([]);
      setMessage(`Copied ${createdRewards.length} reward${createdRewards.length === 1 ? "" : "s"} to next ${tierTarget === "levelTier" ? "level" : tierTarget === "gradeTier" ? "grade" : "class"}.`);
      setRewardSaveDiagnostic(`Copied ${createdRewards.length} reward${createdRewards.length === 1 ? "" : "s"}.`);
    } catch (copyError) {
      const copyMessage = copyError instanceof Error ? copyError.message : "Failed to copy rewards.";
      setError(copyMessage);
      setRewardSaveDiagnostic(`Reward copy failed: ${copyMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkRewardSizeUpdate(target: "pollReward" | "levelReward") {
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to update.");
      return;
    }

    const size = (target === "pollReward" ? bulkPollVisualSize : bulkLevelVisualSize).trim();
    const targetLabel = target === "pollReward" ? "Poll-Level" : "Level-Level";

    if (!size) {
      setError(`Enter a ${targetLabel.toLowerCase()} disk size.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic(`Updating ${targetLabel} size on selected rewards...`);

    try {
      const updatedRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const payload = rewardToPayload(reward, {
          metadata: buildBulkRewardSingleSizeMetadata(reward, target, size)
        });

        const response = await fetch(`/api/admin/game/rewards/${reward.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to update rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to update rewards.");
        }

        updatedRewards.push(data.reward);
      }

      const updatedById = new Map(updatedRewards.map((reward) => [reward.id, reward]));
      setRewards((current) => current.map((reward) => updatedById.get(reward.id) ?? reward));
      setMessage(
        `Updated ${targetLabel} disk size to ${size} on ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`
      );
      setRewardSaveDiagnostic(`Updated ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
    } catch (updateError) {
      const updateMessage = updateError instanceof Error ? updateError.message : "Failed to update rewards.";
      setError(updateMessage);
      setRewardSaveDiagnostic(`Reward bulk update failed: ${updateMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkRewardColorUpdate() {
    const selectedRewards = rewards.filter((reward) => selectedRewardIds.includes(reward.id));

    if (!selectedRewards.length) {
      setError("Select at least one reward to update.");
      return;
    }

    const nextColor = bulkRewardVisualColor;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setRewardSaveDiagnostic("Updating disk color on selected rewards...");

    try {
      const updatedRewards: GameReward[] = [];

      for (const reward of selectedRewards) {
        const payload = rewardToPayload(reward, {
          metadata: buildBulkRewardColorMetadata(reward, nextColor)
        });

        const response = await fetch(`/api/admin/game/rewards/${reward.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await readAdminJson<{ reward?: GameReward; error?: string }>(response, "Failed to update rewards.");

        if (!data.reward) {
          throw new Error(data.error ?? "Failed to update rewards.");
        }

        updatedRewards.push(data.reward);
      }

      const updatedById = new Map(updatedRewards.map((reward) => [reward.id, reward]));
      setRewards((current) => current.map((reward) => updatedById.get(reward.id) ?? reward));
      setMessage(`Updated disk color on ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
      setRewardSaveDiagnostic(`Updated ${updatedRewards.length} reward${updatedRewards.length === 1 ? "" : "s"}.`);
    } catch (updateError) {
      const updateMessage = updateError instanceof Error ? updateError.message : "Failed to update rewards.";
      setError(updateMessage);
      setRewardSaveDiagnostic(`Reward bulk update failed: ${updateMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteReward(reward: GameReward) {
    if (!window.confirm(`Delete reward "${reward.name}"?`)) return;
    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(`/api/admin/game/rewards/${reward.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete reward.");
      setRewards((current) => current.filter((item) => item.id !== reward.id));
      setMessage(`Deleted reward "${reward.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete reward.");
    } finally {
      setIsSaving(false);
    }
  }

  const filteredRewards = useMemo(() => {
    const query = rewardQuery.trim().toLowerCase();
    const levelFilterValue = Number.parseInt(rewardLevelFilter, 10);
    const gradeFilterValue = Number.parseInt(rewardGradeFilter, 10);
    const classFilterValue = Number.parseInt(rewardClassFilter, 10);
    const hasLevelFilter = Number.isFinite(levelFilterValue) && levelFilterValue > 0;
    const hasGradeFilter = Number.isFinite(gradeFilterValue) && gradeFilterValue > 0;
    const hasClassFilter = Number.isFinite(classFilterValue) && classFilterValue > 0;

    return rewards.filter((reward) => {
      if (rewardTypeFilter && reward.rewardType !== rewardTypeFilter) {
        return false;
      }

      if (rewardStatusFilter && reward.status !== rewardStatusFilter) {
        return false;
      }

      if (hasLevelFilter && getRewardTierValue(reward, "levelTier") !== levelFilterValue) {
        return false;
      }

      if (hasGradeFilter && getRewardTierValue(reward, "gradeTier") !== gradeFilterValue) {
        return false;
      }

      if (hasClassFilter && getRewardTierValue(reward, "classTier") !== classFilterValue) {
        return false;
      }

      if (query) {
        const haystack = [reward.name, reward.description, rewardTypeLabel(reward.rewardType), statusLabel(reward.status)]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [rewardClassFilter, rewardGradeFilter, rewardLevelFilter, rewardQuery, rewardStatusFilter, rewardTypeFilter, rewards]);

  // Plain computation: the React Compiler could not preserve a manual memo
  // here; sorting the filtered admin table per render is trivial.
  const sortedRewards = filteredRewards.toSorted((left, right) =>
    compareRewards(left, right, rewardSortKey, rewardSortDirection)
  );

  const rewardLevelOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "levelTier")))).sort((a, b) => a - b),
    [rewards]
  );

  const rewardGradeOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "gradeTier")))).sort((a, b) => a - b),
    [rewards]
  );

  const rewardClassOptions = useMemo(
    () => Array.from(new Set(rewards.map((reward) => getRewardTierValue(reward, "classTier")))).sort((a, b) => a - b),
    [rewards]
  );

  return (
      <>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Rewards & Redemptions</div>
            <h2>Rewards</h2>
            <p className="admin-section-intro">
              Define the achievement rewards players earn as they graduate through progression tracks and sublevels.
            </p>
          </div>
          <button className="submit-button" disabled={isSaving} onClick={startNewReward} type="button">
            New Reward
          </button>
        </div>
        {editingRewardId === "new" ? (
          <RewardEditor
            draft={rewardDraft}
            galleryMedia={galleryMedia}
            gameLevels={gameLevels}
            progressiveFeatures={progressiveFeatures}
            rewards={rewards}
            isSaving={isSaving}
            onCancel={() => setEditingRewardId("")}
            onChange={setRewardDraft}
            onSave={() => void saveReward()}
            onGalleryRefresh={loadGalleryMedia}
          />
        ) : null}
        <div className="admin-products-filter-bar admin-game-filter-bar">
          <label className="field">
            <span>Reward</span>
            <input
              type="search"
              value={rewardQuery}
              onChange={(event) => setRewardQuery(event.target.value)}
              placeholder="Filter rewards"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={rewardTypeFilter}
              onChange={(event) => setRewardTypeFilter(event.target.value as "" | GameRewardType)}
            >
              <option value="">All types</option>
              {GAME_REWARD_TYPES.map((type) => (
                <option key={type} value={type}>{rewardTypeLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={rewardStatusFilter}
              onChange={(event) => setRewardStatusFilter(event.target.value as "" | GameRewardStatus)}
            >
              <option value="">All statuses</option>
              {GAME_REWARD_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select
              value={rewardLevelFilter}
              onChange={(event) => setRewardLevelFilter(event.target.value)}
            >
              <option value="">All levels</option>
              {rewardLevelOptions.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Grade</span>
            <select
              value={rewardGradeFilter}
              onChange={(event) => setRewardGradeFilter(event.target.value)}
            >
              <option value="">All grades</option>
              {rewardGradeOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Class</span>
            <select
              value={rewardClassFilter}
              onChange={(event) => setRewardClassFilter(event.target.value)}
            >
              <option value="">All classes</option>
              {rewardClassOptions.map((classValue) => (
                <option key={classValue} value={classValue}>{classValue}</option>
              ))}
            </select>
          </label>
        </div>
        {hasRewardFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedRewards.length} of {rewards.length} rewards
          </p>
        ) : null}
        <div className="admin-game-reward-bulk-bar">
          <p className="admin-game-reward-bulk-selection">
            {selectedRewardIds.length
              ? `${selectedRewardIds.length} reward${selectedRewardIds.length === 1 ? "" : "s"} selected`
              : "Select one or more rewards to bulk edit"}
          </p>
          <div className="admin-game-reward-bulk-actions">
            <select
              aria-label="Bulk edit selected rewards"
              disabled={isSaving}
              value={rewardBulkAction}
              onChange={(event) => setRewardBulkAction(event.target.value as RewardBulkAction)}
            >
              <option value="levelTier">Level</option>
              <option value="gradeTier">Grade</option>
              <option value="classTier">Class</option>
              <option value="pollSize">Poll-Level</option>
              <option value="levelSize">Level-Level</option>
              <option value="color">Color</option>
            </select>
            {isRewardTierBulkAction(rewardBulkAction) ? (
              <button
                className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                disabled={isSaving || selectedRewardIds.length === 0}
                onClick={() => void copySelectedRewardsToNextTier()}
                type="button"
              >
                Copy to Next...
              </button>
            ) : null}
            {rewardBulkAction === "pollSize" ? (
              <>
                <input
                  aria-label="Bulk poll-level disk size"
                  className="admin-game-reward-bulk-size-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkPollVisualSize(event.target.value)}
                  placeholder="20px"
                  type="text"
                  value={bulkPollVisualSize}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0 || !bulkPollVisualSize.trim()}
                  onClick={() => void applyBulkRewardSizeUpdate("pollReward")}
                  type="button"
                >
                  Apply Poll-Level Size
                </button>
              </>
            ) : null}
            {rewardBulkAction === "levelSize" ? (
              <>
                <input
                  aria-label="Bulk level-level disk size"
                  className="admin-game-reward-bulk-size-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkLevelVisualSize(event.target.value)}
                  placeholder="42px"
                  type="text"
                  value={bulkLevelVisualSize}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0 || !bulkLevelVisualSize.trim()}
                  onClick={() => void applyBulkRewardSizeUpdate("levelReward")}
                  type="button"
                >
                  Apply Level-Level Size
                </button>
              </>
            ) : null}
            {rewardBulkAction === "color" ? (
              <>
                <input
                  aria-label="Bulk disk color"
                  className="admin-game-reward-bulk-color-input"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onChange={(event) => setBulkRewardVisualColor(event.target.value)}
                  type="color"
                  value={normalizeBuilderHexColor(bulkRewardVisualColor, DEFAULT_BADGE_BACKGROUND_COLOR)}
                />
                <button
                  className="submit-button admin-blog-add-button admin-game-reward-bulk-button"
                  disabled={isSaving || selectedRewardIds.length === 0}
                  onClick={() => void applyBulkRewardColorUpdate()}
                  type="button"
                >
                  Apply Color
                </button>
              </>
            ) : null}
          </div>
        </div>
        {rewardSaveDiagnostic ? (
          <div
            className={`notice admin-game-reward-status admin-game-reward-status-${getRewardSaveDiagnosticTone(rewardSaveDiagnostic, isSaving) ?? "success"}`}
            role="status"
          >
            {rewardSaveDiagnostic}
          </div>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>
                  <label className="admin-game-table-checkbox-label">
                    <input
                      aria-label="Check all rewards"
                      checked={sortedRewards.length > 0 && sortedRewards.every((reward) => selectedRewardIds.includes(reward.id))}
                      disabled={isSaving || sortedRewards.length === 0}
                      onChange={(event) => toggleAllVisibleRewards(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Check All</span>
                  </label>
                </th>
                {REWARD_TABLE_COLUMNS.map((column) => (
                  <th className={column.key === "rewardVisual" ? "admin-game-reward-visual-cell" : undefined} key={column.key}>
                    <AdminTableSortButton
                      activeSortKey={rewardSortKey}
                      label={column.label}
                      onSort={handleRewardSort}
                      sortDirection={rewardSortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRewards.map((reward) => (
                <Fragment key={reward.id}>
                  <tr className={editingRewardId === reward.id ? "admin-game-inline-editor-source-row" : undefined}>
                    <td>
                      <input
                        aria-label={`Select reward ${reward.name}`}
                        checked={selectedRewardIds.includes(reward.id)}
                        disabled={isSaving}
                        onChange={(event) => toggleRewardSelection(reward.id, event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong>{reward.name}</strong>
                      {reward.description ? <div className="admin-table-subcopy">{reward.description}</div> : null}
                    </td>
                    <td>{rewardTypeLabel(reward.rewardType)}</td>
                    <td>{getRewardTierValue(reward, "levelTier")}</td>
                    <td>{getRewardTierValue(reward, "gradeTier")}</td>
                    <td>{getRewardTierValue(reward, "classTier")}</td>
                    <td className="admin-game-reward-visual-cell">
                      <RewardVisualSummary reward={reward} />
                    </td>
                    <td className="crud-actions-cell">
                      <div className="table-actions">
                        <button
                          aria-label="Edit reward"
                          className="polls-icon-button polls-icon-button-edit"
                          disabled={isSaving}
                          onClick={() => {
                            setEditingRewardId(reward.id);
                            setRewardDraft(rewardToDraft(reward, gameLevels));
                          }}
                          title="Edit"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Clone reward"
                          className="polls-icon-button polls-icon-button-view"
                          disabled={isSaving}
                          onClick={() => void cloneReward(reward)}
                          title="Clone"
                          type="button"
                        >
                          ⧉
                        </button>
                        <button
                          aria-label="Delete reward"
                          className="polls-icon-button polls-icon-button-danger"
                          disabled={isSaving}
                          onClick={() => void deleteReward(reward)}
                          title="Delete"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingRewardId === reward.id ? (
                    <tr className="admin-game-inline-editor-row">
                      <td colSpan={REWARD_TABLE_COLUMN_COUNT}>
                        <RewardEditor
                          draft={rewardDraft}
                          galleryMedia={galleryMedia}
                          gameLevels={gameLevels}
                          progressiveFeatures={progressiveFeatures}
                          rewards={rewards}
                          isSaving={isSaving}
                          onCancel={() => setEditingRewardId("")}
                          onChange={setRewardDraft}
                          onSave={() => void saveReward()}
                          onGalleryRefresh={loadGalleryMedia}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {sortedRewards.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={REWARD_TABLE_COLUMN_COUNT}>
                    {isLoading
                      ? "Loading rewards..."
                      : rewards.length === 0
                        ? "No rewards found."
                        : "No rewards match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Point Redemptions</div>
            <h2>Redemptions</h2>
            <p className="admin-section-intro">
              The redemption catalog will sit here under the reward definitions as we wire points-for-reward claiming.
            </p>
          </div>
        </div>
      </section>
      </>

  );
}
