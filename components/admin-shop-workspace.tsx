"use client";

import { useEffect, useMemo, useState } from "react";
import type { BuilderProductRecord } from "@/lib/builder-template";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { formatTemplateTimestamp } from "@/components/builder/builder-utils";

type ImagePreviewState = {
  url: string;
  alt: string;
};

type ProductDraft = Partial<BuilderProductRecord> & { id?: string };
type ProductSortKey = "name" | "productType" | "productUrl" | "imageUrl" | "updatedAt";
type SortDirection = "asc" | "desc";

const PRODUCT_TABLE_COLUMNS: Array<{ key: ProductSortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "productType", label: "Type" },
  { key: "productUrl", label: "Product URL" },
  { key: "imageUrl", label: "Image URL" },
  { key: "updatedAt", label: "Updated" }
];

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

function getProductTypeLabel(productType: BuilderProductRecord["productType"]) {
  return PRODUCT_TYPES.find((type) => type.value === productType)?.label ?? productType;
}

function extractProductUrlLabel(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname.includes("redbubble.com") && parts[0] === "i" && parts[1]) {
      return parts[1];
    }

    return parts[parts.length - 1] || parsed.hostname;
  } catch {
    return trimmed;
  }
}

function productMatchesFilters(
  product: BuilderProductRecord,
  filters: {
    nameQuery: string;
    productUrlQuery: string;
    productType: "" | BuilderProductRecord["productType"];
  }
) {
  if (filters.productType && product.productType !== filters.productType) {
    return false;
  }

  if (filters.nameQuery && !product.name.toLowerCase().includes(filters.nameQuery)) {
    return false;
  }

  if (filters.productUrlQuery) {
    const urlNeedle = [
      product.productUrl,
      extractProductUrlLabel(product.productUrl)
    ]
      .join(" ")
      .toLowerCase();

    if (!urlNeedle.includes(filters.productUrlQuery)) {
      return false;
    }
  }

  return true;
}

function ProductUrlCell({ url }: { url: string }) {
  const trimmed = url.trim();

  if (!trimmed) {
    return <span className="admin-table-empty">—</span>;
  }

  const label = extractProductUrlLabel(trimmed);

  return (
    <a className="admin-product-link" href={trimmed} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  );
}

function ProductImageCell({
  imageUrl,
  productName,
  onPreview
}: {
  imageUrl: string;
  productName: string;
  onPreview: (preview: ImagePreviewState) => void;
}) {
  const normalizedUrl = normalizeBuilderAssetUrl(imageUrl);

  if (!normalizedUrl) {
    return <span className="admin-table-empty">—</span>;
  }

  return (
    <button
      aria-label={`View full image for ${productName}`}
      className="admin-product-thumb-button"
      onClick={() => onPreview({ url: normalizedUrl, alt: productName })}
      type="button"
    >
      <img alt="" className="admin-product-thumb" height={50} src={normalizedUrl} width={50} />
    </button>
  );
}

function AdminImagePreviewModal({
  preview,
  onClose
}: {
  preview: ImagePreviewState;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="builder-gallery-overlay admin-image-preview-overlay" onClick={onClose} role="presentation">
      <div
        className="admin-image-preview-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${preview.alt} preview`}
      >
        <div className="admin-image-preview-header">
          <strong>{preview.alt}</strong>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <img alt={preview.alt} className="admin-image-preview-full" src={preview.url} />
      </div>
    </div>
  );
}

function compareProducts(
  left: BuilderProductRecord,
  right: BuilderProductRecord,
  sortKey: ProductSortKey,
  sortDirection: SortDirection
) {
  let result = 0;

  switch (sortKey) {
    case "name":
    case "productUrl":
    case "imageUrl":
      result = left[sortKey].localeCompare(right[sortKey], undefined, { sensitivity: "base" });
      break;
    case "productType":
      result = getProductTypeLabel(left.productType).localeCompare(getProductTypeLabel(right.productType), undefined, {
        sensitivity: "base"
      });
      break;
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      break;
  }

  return sortDirection === "asc" ? result : -result;
}

function ProductTableSortButton({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort
}: {
  label: string;
  sortKey: ProductSortKey;
  activeSortKey: ProductSortKey;
  sortDirection: SortDirection;
  onSort: (key: ProductSortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const indicator = isActive ? (sortDirection === "asc" ? "▲" : "▼") : "↕";

  return (
    <button
      aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className={`admin-table-sort-button${isActive ? " is-active" : ""}`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="admin-table-sort-indicator">
        {indicator}
      </span>
    </button>
  );
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
        <button
          className="submit-button admin-blog-add-button"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
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
  const [sortKey, setSortKey] = useState<ProductSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterProductUrl, setFilterProductUrl] = useState("");
  const [filterType, setFilterType] = useState<"" | BuilderProductRecord["productType"]>("");

  const filteredProducts = useMemo(() => {
    const nameQuery = filterName.trim().toLowerCase();
    const productUrlQuery = filterProductUrl.trim().toLowerCase();

    return products.filter((product) =>
      productMatchesFilters(product, {
        nameQuery,
        productUrlQuery,
        productType: filterType
      })
    );
  }, [filterName, filterProductUrl, filterType, products]);

  const sortedProducts = useMemo(
    () => [...filteredProducts].sort((left, right) => compareProducts(left, right, sortKey, sortDirection)),
    [filteredProducts, sortDirection, sortKey]
  );

  const hasActiveFilters = Boolean(filterName.trim() || filterProductUrl.trim() || filterType);

  function handleSort(nextKey: ProductSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

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
        <div className="admin-products-filter-bar">
          <label className="field">
            <span>Name</span>
            <input
              type="search"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Filter by product name"
            />
          </label>
          <label className="field">
            <span>Product URL</span>
            <input
              type="search"
              value={filterProductUrl}
              onChange={(event) => setFilterProductUrl(event.target.value)}
              placeholder="e.g. t-shirt, mug"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(event.target.value as "" | BuilderProductRecord["productType"])
              }
            >
              <option value="">All types</option>
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasActiveFilters ? (
          <p className="admin-products-filter-summary">
            Showing {sortedProducts.length} of {products.length} products
          </p>
        ) : null}
        <div className="table-shell builder-templates-shell">
          <table className="polls-table builder-templates-table">
            <thead>
              <tr>
                {PRODUCT_TABLE_COLUMNS.map((column) => (
                  <th key={column.key}>
                    <ProductTableSortButton
                      activeSortKey={sortKey}
                      label={column.label}
                      onSort={handleSort}
                      sortDirection={sortDirection}
                      sortKey={column.key}
                    />
                  </th>
                ))}
                <th className="crud-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td>{getProductTypeLabel(product.productType)}</td>
                  <td className="admin-product-url-cell">
                    <ProductUrlCell url={product.productUrl} />
                  </td>
                  <td className="admin-product-image-cell">
                    <ProductImageCell
                      imageUrl={product.imageUrl}
                      productName={product.name}
                      onPreview={setImagePreview}
                    />
                  </td>
                  <td>{formatTemplateTimestamp(product.updatedAt)}</td>
                  <td className="crud-actions-cell">
                    <div className="table-actions">
                      <button
                        className="polls-icon-button polls-icon-button-edit"
                        disabled={isSaving}
                        onClick={() => startEditing(product)}
                        type="button"
                        aria-label="Edit product"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="polls-icon-button polls-icon-button-danger"
                        disabled={isSaving}
                        onClick={() => void deleteProduct(product)}
                        type="button"
                        aria-label="Delete product"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedProducts.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {isLoading
                      ? "Loading products..."
                      : products.length === 0
                        ? "No products found."
                        : "No products match the current filters."}
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

      {imagePreview ? <AdminImagePreviewModal preview={imagePreview} onClose={() => setImagePreview(null)} /> : null}
    </section>
  );
}
