"use client";

import { useEffect, useState } from "react";
import type { BuilderProductRecord } from "@/lib/builder-template";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";

type ProductDraft = Partial<BuilderProductRecord> & { id?: string };

const PRODUCT_TYPES: Array<{ value: BuilderProductRecord["productType"]; label: string }> = [
  { value: "merch", label: "Merch" },
  { value: "personality_profile", label: "Personality Profile" }
];

function createEmptyProductDraft(): ProductDraft {
  return {
    name: "",
    productType: "merch",
    productUrl: "",
    imageUrl: ""
  };
}

async function readAdminJson<T extends { error?: string }>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(`${fallbackMessage} ${preview || "The server returned a non-JSON response."}`);
  }

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

function ProductEditor({
  draft,
  isSaving,
  onCancel,
  onChange,
  onSave
}: {
  draft: ProductDraft;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (next: ProductDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="builder-product-editor">
      <div className="builder-product-editor-grid">
        <label className="field">
          <span>Product name</span>
          <input
            type="text"
            value={draft.name ?? ""}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="Classic Mug"
          />
        </label>
        <label className="field">
          <span>Product type</span>
          <select
            value={draft.productType ?? "merch"}
            onChange={(event) =>
              onChange({
                ...draft,
                productType: event.target.value as BuilderProductRecord["productType"]
              })
            }
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Product URL</span>
          <input
            type="text"
            value={draft.productUrl ?? ""}
            onChange={(event) => onChange({ ...draft, productUrl: event.target.value })}
            placeholder="https://www.redbubble.com/i/..."
          />
        </label>
        <label className="field">
          <span>Image URL</span>
          <input
            type="text"
            value={draft.imageUrl ?? ""}
            onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })}
            placeholder="https://ih1.redbubble.net/..."
          />
        </label>
      </div>
      <div className="builder-meta-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="submit-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "Saving..." : "Save Product"}
        </button>
      </div>
    </div>
  );
}

export function AdminShopWorkspace() {
  const [products, setProducts] = useState<BuilderProductRecord[]>([]);
  const [editingProductId, setEditingProductId] = useState("");
  const [draft, setDraft] = useState<ProductDraft>(createEmptyProductDraft());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await readAdminJson<{ products?: BuilderProductRecord[]; error?: string }>(response, "Failed to load products.");
      setProducts(data.products ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load products.");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function startNewProduct() {
    setEditingProductId("new");
    setDraft(createEmptyProductDraft());
    setMessage(null);
    setError(null);
  }

  function startEditing(product: BuilderProductRecord) {
    setEditingProductId(product.id);
    setDraft({ ...product });
    setMessage(null);
    setError(null);
  }

  function cancelEditing() {
    setEditingProductId("");
    setDraft(createEmptyProductDraft());
  }

  async function saveProduct() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(draft.id ? `/api/admin/products/${draft.id}` : "/api/admin/products", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          productType: draft.productType,
          productUrl: draft.productUrl,
          imageUrl: draft.imageUrl
        })
      });
      const data = await readAdminJson<{ product?: BuilderProductRecord; error?: string }>(response, "Failed to save product.");

      if (!data.product) {
        throw new Error(data.error ?? "Failed to save product.");
      }

      setProducts((current) =>
        draft.id
          ? current.map((product) => (product.id === data.product!.id ? data.product! : product))
          : [data.product!, ...current]
      );
      setMessage(`Saved product "${data.product.name}".`);
      cancelEditing();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(product: BuilderProductRecord) {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete product.");

      setProducts((current) => current.filter((candidate) => candidate.id !== product.id));
      setMessage(`Deleted product "${product.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Shop</div>
            <h2>Products</h2>
            <p className="page-copy admin-copy">
              Manage product data for merch modules and future shop experiences.
            </p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={() => void loadProducts()} type="button" disabled={isLoading}>
              Refresh
            </button>
            <button className="submit-button" onClick={startNewProduct} type="button" disabled={isSaving}>
              New Product
            </button>
          </div>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}

        {editingProductId === "new" ? (
          <ProductEditor
            draft={draft}
            isSaving={isSaving}
            onCancel={cancelEditing}
            onChange={setDraft}
            onSave={() => void saveProduct()}
          />
        ) : null}
      </section>

      <section className="admin-section">
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Product URL</th>
                <th>Image URL</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td>{PRODUCT_TYPES.find((type) => type.value === product.productType)?.label ?? product.productType}</td>
                  <td className="template-id-cell"><code>{product.productUrl}</code></td>
                  <td className="template-id-cell"><code>{product.imageUrl}</code></td>
                  <td>{formatTemplateTimestamp(product.updatedAt)}</td>
                  <td>
                    <div className="builder-template-actions">
                      <button
                        className="secondary-button"
                        disabled={isSaving}
                        onClick={() => startEditing(product)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="row-delete-button"
                        disabled={isSaving}
                        onClick={() => void deleteProduct(product)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading ? "Loading products..." : "No products found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {editingProductId && editingProductId !== "new" ? (
          <div className="builder-product-editor-inline">
            <ProductEditor
              draft={draft}
              isSaving={isSaving}
              onCancel={cancelEditing}
              onChange={setDraft}
              onSave={() => void saveProduct()}
            />
          </div>
        ) : null}
      </section>
    </section>
  );
}
