"use client";

import { useState } from "react";
import { normalizeBlogSlugInput, slugifyBlogText } from "@/lib/blog";

export type AdminBlogTaxonomyItem = {
  id: string;
  name: string;
  slug: string;
};

type AdminBlogTaxonomyResource = "topics" | "categories" | "tags";

type AdminBlogTaxonomyListProps = {
  items: AdminBlogTaxonomyItem[];
  resource: AdminBlogTaxonomyResource;
  label: string;
  columns?: number;
  disabled?: boolean;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

function partitionRoundRobin<T>(list: T[], columnCount: number): T[][] {
  const columns = Array.from({ length: columnCount }, () => [] as T[]);

  for (let index = 0; index < list.length; index++) {
    columns[index % columnCount].push(list[index]);
  }

  return columns;
}

function apiPath(resource: AdminBlogTaxonomyResource, id: string) {
  return `/api/admin/blog/${resource}/${id}`;
}

export function AdminBlogTaxonomyList({
  items,
  resource,
  label,
  columns = 1,
  disabled = false,
  onChanged,
  onError,
  onMessage
}: AdminBlogTaxonomyListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", slug: "" });
  const [isBusy, setIsBusy] = useState(false);

  const selectedCount = selectedIds.size;
  const columnGroups = columns > 1 ? partitionRoundRobin(items, columns) : [items];

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function startEdit(item: AdminBlogTaxonomyItem) {
    if (disabled || isBusy) {
      return;
    }

    setEditingId(item.id);
    setEditDraft({ name: item.name, slug: item.slug });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ name: "", slug: "" });
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }

    setIsBusy(true);
    onError("");

    try {
      const response = await fetch(apiPath(resource, editingId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          slug: slugifyBlogText(editDraft.slug || editDraft.name)
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to update ${label}.`);
      }

      cancelEdit();
      onMessage(`${label.charAt(0).toUpperCase()}${label.slice(1)} updated.`);
      await onChanged();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : `Failed to update ${label}.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function bulkDelete() {
    if (selectedCount === 0) {
      return;
    }

    const noun = selectedCount === 1 ? label : `${label}s`;
    const confirmed = window.confirm(`Delete ${selectedCount} selected ${noun}?`);

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    onError("");

    try {
      const ids = [...selectedIds];
      const results = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(apiPath(resource, id), { method: "DELETE" });
          const payload = (await response.json()) as { error?: string };
          return { id, ok: response.ok, error: payload.error };
        })
      );

      const failures = results.filter((result) => !result.ok);

      if (failures.length > 0) {
        throw new Error(failures[0]?.error ?? `Failed to delete some ${label}s.`);
      }

      setSelectedIds(new Set());

      if (editingId && ids.includes(editingId)) {
        cancelEdit();
      }

      onMessage(
        results.length === 1
          ? `${label.charAt(0).toUpperCase()}${label.slice(1)} deleted.`
          : `${results.length} ${label}s deleted.`
      );
      await onChanged();
    } catch (deleteError) {
      onError(deleteError instanceof Error ? deleteError.message : `Failed to delete ${label}s.`);
    } finally {
      setIsBusy(false);
    }
  }

  function renderRow(item: AdminBlogTaxonomyItem) {
    const isEditing = editingId === item.id;
    const isSelected = selectedIds.has(item.id);

    return (
      <li className={`admin-blog-taxonomy-row${isEditing ? " is-editing" : ""}`} key={item.id}>
        <label className="admin-blog-taxonomy-check">
          <input
            checked={isSelected}
            disabled={disabled || isBusy || isEditing}
            onChange={(event) => toggleSelected(item.id, event.target.checked)}
            type="checkbox"
          />
        </label>

        {isEditing ? (
          <div className="admin-blog-taxonomy-inline">
            <label className="field admin-blog-taxonomy-inline-field">
              <span>Name</span>
              <input
                value={editDraft.name}
                onChange={(event) =>
                  setEditDraft({
                    name: event.target.value,
                    slug: slugifyBlogText(event.target.value)
                  })
                }
              />
            </label>
            <label className="field admin-blog-taxonomy-inline-field">
              <span>Slug</span>
              <input
                value={editDraft.slug}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, slug: normalizeBlogSlugInput(event.target.value) })
                }
              />
            </label>
            <div className="admin-blog-taxonomy-inline-actions">
              <button
                className="submit-button"
                disabled={isBusy || !editDraft.name.trim()}
                onClick={() => void saveEdit()}
                type="button"
              >
                Save
              </button>
              <button className="secondary-button" disabled={isBusy} onClick={cancelEdit} type="button">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="admin-blog-taxonomy-display"
            disabled={disabled || isBusy}
            onClick={() => startEdit(item)}
            type="button"
          >
            <strong>{item.name}</strong> <span className="gallery-meta">/{item.slug}</span>
          </button>
        )}
      </li>
    );
  }

  if (items.length === 0) {
    return <p className="admin-blog-taxonomy-empty">No {label}s yet.</p>;
  }

  return (
    <div className="admin-blog-taxonomy-manage">
      {columns > 1 ? (
        <div className="admin-blog-taxonomy-columns">
          {columnGroups.map((columnItems, columnIndex) => (
            <ul className="admin-blog-taxonomy-list" key={columnIndex}>
              {columnItems.map((item) => renderRow(item))}
            </ul>
          ))}
        </div>
      ) : (
        <ul className="admin-blog-taxonomy-list">{items.map((item) => renderRow(item))}</ul>
      )}

      <div className="admin-blog-taxonomy-toolbar">
        <button
          className="danger-button admin-blog-taxonomy-delete-button"
          disabled={disabled || isBusy || selectedCount === 0}
          onClick={() => void bulkDelete()}
          type="button"
        >
          {selectedCount > 0 ? `Delete selected (${selectedCount})` : "Delete selected"}
        </button>
      </div>
    </div>
  );
}
