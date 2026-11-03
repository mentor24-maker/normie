

import type { BuilderTemplateModule } from "@/lib/builder-template";

import { HEADLINE_ROTATOR_DEFAULT_FONT_SIZE, HEADLINE_ROTATOR_MAX_Y_PERCENT, getHeadlineRotatorSkyPosition } from "@/lib/headline-rotator";

import { createBuilderItemId } from "./builder-utils";

import { parseHeadlineItems, serializeHeadlineItems, type HeadlineItem } from "./builder-module-items";

export function HeadlineRotatorModuleEditor({
  module,
  onUpdateModule
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
}) {
  const items = parseHeadlineItems(module.settings);

  function persist(nextItems: HeadlineItem[]) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, headlines: serializeHeadlineItems(nextItems) } }));
  }

  function updateItem(id: string, updates: Partial<HeadlineItem>) {
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
    const position = getHeadlineRotatorSkyPosition(items.length);
    persist([
      ...items,
      {
        id: createBuilderItemId("headline", items.length),
        label: "",
        href: "",
        xAxis: position.xAxis,
        yAxis: position.yAxis,
        color: module.settings.color || "#18324a",
        overlap: "400"
      }
    ]);
  }

  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  return (
    <>
      <div className="builder-slider-design-grid">
        <label className="field"><span>Font size (px)</span><input type="number" min="10" max="120" value={module.settings.fontSize ?? HEADLINE_ROTATOR_DEFAULT_FONT_SIZE} onChange={(e) => updateSetting("fontSize", e.target.value)} /></label>
        <label className="field"><span>Color</span><input type="text" value={module.settings.color ?? "#18324a"} onChange={(e) => updateSetting("color", e.target.value)} placeholder="#18324a" /></label>
        <label className="field builder-checkbox-field"><span>Bold</span><input type="checkbox" checked={module.settings.bold !== "false"} onChange={(e) => updateSetting("bold", e.target.checked ? "true" : "false")} /></label>
        <label className="field"><span>Vertical alignment</span><select value={module.settings.verticalAlignment ?? "center"} onChange={(e) => updateSetting("verticalAlignment", e.target.value)}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
        <label className="field"><span>Min height (px)</span><input type="number" min="0" max="1200" step="4" value={module.settings.minHeight ?? "480"} onChange={(e) => updateSetting("minHeight", e.target.value)} /></label>
        <label className="field"><span>Fade duration (ms)</span><input type="number" min="0" max="5000" step="50" value={module.settings.fadeDuration ?? "800"} onChange={(e) => updateSetting("fadeDuration", e.target.value)} /></label>
        <label className="field"><span>Display speed (ms)</span><input type="number" min="500" max="20000" step="100" value={module.settings.displaySpeed ?? "3000"} onChange={(e) => updateSetting("displaySpeed", e.target.value)} /></label>
        <label className="field"><span>Drop shadow</span><select value={module.settings.dropShadow ?? "false"} onChange={(e) => updateSetting("dropShadow", e.target.value)}><option value="false">Off</option><option value="true">On</option></select></label>
        <label className="field"><span>Shadow color</span><input type="color" value={module.settings.dropShadowColor?.startsWith("#") ? module.settings.dropShadowColor : "#000000"} onChange={(e) => updateSetting("dropShadowColor", e.target.value)} /></label>
        <label className="field"><span>Shadow X</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowX ?? "3"} onChange={(e) => updateSetting("dropShadowX", e.target.value)} /></label>
        <label className="field"><span>Shadow Y</span><input type="number" min="-20" max="20" step="1" value={module.settings.dropShadowY ?? "3"} onChange={(e) => updateSetting("dropShadowY", e.target.value)} /></label>
        <label className="field"><span>Shadow blur</span><input type="number" min="0" max="30" step="1" value={module.settings.dropShadowBlur ?? "2"} onChange={(e) => updateSetting("dropShadowBlur", e.target.value)} /></label>
      </div>
      <div className="builder-headline-table-wrap">
        <table className="builder-headline-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Link</th>
              <th>X-axis</th>
              <th>Y-axis</th>
              <th>Color</th>
              <th>Overlap (ms)</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <input
                    aria-label={`Headline ${index + 1}`}
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} link`}
                    type="text"
                    value={item.href}
                    onChange={(e) => updateItem(item.id, { href: e.target.value })}
                    placeholder="/path-or-url"
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} x-axis`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    title="Horizontal position (0 = left, 100 = right)"
                    value={item.xAxis}
                    onChange={(e) => updateItem(item.id, { xAxis: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} y-axis`}
                    type="number"
                    min="0"
                    max={String(HEADLINE_ROTATOR_MAX_Y_PERCENT)}
                    step="1"
                    title={`Vertical position in the sky band (0 = top, ${HEADLINE_ROTATOR_MAX_Y_PERCENT} = just above horizon)`}
                    value={item.yAxis}
                    onChange={(e) => updateItem(item.id, { yAxis: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} color`}
                    type="color"
                    value={item.color.startsWith("#") ? item.color : module.settings.color || "#18324a"}
                    onChange={(e) => updateItem(item.id, { color: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Headline ${index + 1} overlap`}
                    type="number"
                    min="0"
                    max="10000"
                    step="50"
                    title="Milliseconds the next headline fades in before the current one finishes (e.g. 400 with 800ms fade)"
                    value={item.overlap}
                    onChange={(e) => updateItem(item.id, { overlap: e.target.value })}
                  />
                </td>
                <td>
                  <div className="builder-headline-table-actions">
                    <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, -1)} title="Move up">↑</button>
                    <button type="button" className="builder-icon-button" onClick={() => moveItem(item.id, 1)} title="Move down">↓</button>
                    <button type="button" className="builder-icon-button builder-icon-button-danger" onClick={() => removeItem(item.id)} title="Delete headline">✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={7}>No headlines yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <button type="button" className="secondary-button" onClick={addItem}>Add Headline</button>
    </>
  );
}

