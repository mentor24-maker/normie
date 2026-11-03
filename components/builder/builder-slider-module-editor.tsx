

import type { BuilderTemplateModule } from "@/lib/builder-template";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";

import { createBuilderItemId } from "./builder-utils";

import { BuilderInlineNumberSelect, BuilderInlineNumberSelectRow } from "./builder-inline-number-select";
import { parseSliderItems, serializeSliderItems, type SliderItem } from "./builder-module-items";

export function SliderModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseSliderItems(module.settings);

  function persist(nextItems: SliderItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderItems: serializeSliderItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<SliderItem>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, moved);
    persist(nextItems);
  }

  function removeItem(id: string) { persist(items.filter((item) => item.id !== id)); }

  function addItem() {
    persist([...items, { id: createBuilderItemId("slide", items.length), title: "", body: "", imageUrl: "", linkUrl: "" }]);
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <BuilderInlineNumberSelectRow>
          <BuilderInlineNumberSelect
            label="Card width"
            value={module.settings.sliderCardWidth ?? "280"}
            min={180}
            max={420}
            step={10}
            fallback="280"
            onChange={(value) =>
              onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderCardWidth: value } }))
            }
          />
          <BuilderInlineNumberSelect
            label="Gap"
            value={module.settings.sliderGap ?? "16"}
            min={8}
            max={40}
            step={2}
            fallback="16"
            onChange={(value) =>
              onUpdateModule((current) => ({ ...current, settings: { ...current.settings, sliderGap: value } }))
            }
          />
        </BuilderInlineNumberSelectRow>
      </div>
      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.title || `Slide ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete slide">✕</button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field"><span>Title</span><input type="text" value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} /></label>
              <label className="field"><span>Link</span><input type="text" value={item.linkUrl} onChange={(e) => updateItem(item.id, { linkUrl: e.target.value })} placeholder="/path-or-url" /></label>
              <label className="field builder-slider-item-grid-full"><span>Image URL</span><input type="text" value={item.imageUrl} onChange={(e) => updateItem(item.id, { imageUrl: normalizeBuilderAssetUrl(e.target.value) })} placeholder="https://..." /></label>
              <label className="field builder-slider-item-grid-full"><span>Description</span><textarea className="builder-textarea" rows={3} value={item.body} onChange={(e) => updateItem(item.id, { body: e.target.value })} placeholder="Add copy for this slide" /></label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Slide</button>
    </>
  );
}

