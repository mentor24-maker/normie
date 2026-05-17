"use client";

import { useState } from "react";
import type { BuilderProductRecord, BuilderTemplateModule } from "@/lib/builder-template";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { BuilderProductPickerModal } from "@/components/builder/builder-product-picker-modal";

type MerchModuleEditorProps = {
  module: BuilderTemplateModule;
  products: BuilderProductRecord[];
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
};

export function MerchModuleEditor({ module, products, onUpdateModule }: MerchModuleEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const merchProducts = products.filter((product) => product.productType === "merch");
  const selectedProduct = merchProducts.find((product) => product.id === module.settings.productId);

  function applyMerchProduct(productId: string) {
    const product = products.find((candidate) => candidate.id === productId);

    onUpdateModule((current) => ({
      ...current,
      settings: {
        ...current.settings,
        productId,
        productUrl: product?.productUrl ?? current.settings.productUrl ?? "",
        productName: product?.name ?? current.settings.productName ?? "",
        imageUrl: product?.imageUrl ?? current.settings.imageUrl ?? ""
      }
    }));
  }

  return (
    <>
      <div className="builder-merch-editor-grid">
        <div className="builder-product-picker-row">
          <label className="field builder-merch-product-picker-field">
            <span>Saved product</span>
            <input
              type="text"
              readOnly
              value={selectedProduct?.name ?? ""}
              placeholder="Choose from shop"
            />
          </label>
          <button
            aria-label="Browse shop products"
            className="builder-icon-button builder-product-picker-button"
            onClick={() => setIsPickerOpen(true)}
            title="Browse shop products"
            type="button"
          >
            🛍
          </button>
        </div>

        <label className="field builder-merch-product-url-field">
          <span>Product URL</span>
          <input
            type="text"
            value={module.settings.productUrl ?? ""}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, productUrl: event.target.value }
              }))
            }
            placeholder="https://www.redbubble.com/i/t-shirt/..."
          />
        </label>
        <label className="field">
          <span>Product name</span>
          <input
            type="text"
            value={module.settings.productName ?? ""}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, productName: event.target.value }
              }))
            }
            placeholder="Active T-Shirt"
          />
        </label>
        <label className="field">
          <span>Image URL</span>
          <input
            type="text"
            value={module.settings.imageUrl ?? ""}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, imageUrl: normalizeBuilderAssetUrl(event.target.value) }
              }))
            }
            placeholder="https://ih1.redbubble.net/..."
          />
        </label>
        <label className="field">
          <span>Button label</span>
          <input
            type="text"
            value={module.settings.buttonLabel ?? "Buy on Redbubble"}
            onChange={(event) =>
              onUpdateModule((current) => ({
                ...current,
                settings: { ...current.settings, buttonLabel: event.target.value }
              }))
            }
            placeholder="Buy on Redbubble"
          />
        </label>
      </div>

      {isPickerOpen ? (
        <BuilderProductPickerModal
          products={merchProducts}
          selectedProductId={module.settings.productId}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(productId) => {
            applyMerchProduct(productId);
            setIsPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
