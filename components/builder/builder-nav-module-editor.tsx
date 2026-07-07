

import type { BuilderTemplateModule } from "@/lib/builder-template";

import { createBuilderItemId } from "./builder-utils";

import { parseNavItems, serializeNavItems, type NavItem } from "./builder-module-items";

export function NavModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseNavItems(module.settings);

  function persist(nextItems: NavItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, navItems: serializeNavItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<NavItem>) {
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
    persist([...items, { id: createBuilderItemId("nav", items.length), label: "", href: "" }]);
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Font size (px)</span><input type="number" min="10" max="48" value={module.settings.navFontSize ?? "16"} onChange={(e) => updateSetting("navFontSize", e.target.value)} /></label>
        <label className="field builder-checkbox-field"><span>Bold</span><input type="checkbox" checked={module.settings.navBold === "true"} onChange={(e) => updateSetting("navBold", e.target.checked ? "true" : "false")} /></label>
        <label className="field"><span>Border radius (px)</span><input type="number" min="0" max="48" value={module.settings.navBorderRadius ?? "0"} onChange={(e) => updateSetting("navBorderRadius", e.target.value)} /></label>
        <label className="field"><span>Padding</span><input type="text" value={module.settings.navPadding ?? "8px 12px"} onChange={(e) => updateSetting("navPadding", e.target.value)} placeholder="8px 12px" /></label>
        <label className="field"><span>Text color</span><input type="text" value={module.settings.navColor ?? ""} onChange={(e) => updateSetting("navColor", e.target.value)} placeholder="#ffffff" /></label>
        <label className="field"><span>Hover text color</span><input type="text" value={module.settings.navHoverColor ?? ""} onChange={(e) => updateSetting("navHoverColor", e.target.value)} placeholder="#ffffff" /></label>
        <label className="field"><span>Hover background</span><input type="text" value={module.settings.navHoverBackground ?? ""} onChange={(e) => updateSetting("navHoverBackground", e.target.value)} placeholder="#e8f8ff" /></label>
      </div>
      <div className="builder-slider-items">
        {items.map((item, index) => (
          <div key={item.id} className="builder-slider-item-card">
            <div className="builder-slider-item-header">
              <strong>{item.label || `Link ${index + 1}`}</strong>
              <div className="builder-section-actions">
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete link">✕</button>
              </div>
            </div>
            <div className="builder-slider-item-grid">
              <label className="field"><span>Label</span><input type="text" value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} /></label>
              <label className="field"><span>Link</span><input type="text" value={item.href} onChange={(e) => updateItem(item.id, { href: e.target.value })} placeholder="/path-or-url" /></label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Nav Item</button>
    </>
  );
}

