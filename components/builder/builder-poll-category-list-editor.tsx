

import type { BackgroundSettings, BuilderTemplateModule } from "@/lib/builder-template";

import { BuilderAlignmentIconGroup } from "./builder-alignment-icon-group";
import { BuilderBackgroundControls } from "./builder-background-controls";

import { getModuleAlignment, getModuleBackgroundSettings, isPollCategoryListPanelTransparent } from "./builder-utils";

import { BuilderSettingRow } from "./builder-setting-row";

import { normalizePollCategoryListFlow, normalizePollCategoryListSort, POLL_CATEGORY_LIST_DEFAULT_FONT_SIZE, POLL_CATEGORY_LIST_DEFAULT_ITEM_GAP, POLL_CATEGORY_LIST_DEFAULT_TITLE, type PollCategoryListFlow, type PollCategoryListSort } from "@/lib/poll-category-list";

export function PollCategoryListModuleEditor({
  module,
  onUpdateModule,
  onUpdateModuleBackground
}: {
  module: BuilderTemplateModule;
  onUpdateModule: (updater: (current: BuilderTemplateModule) => BuilderTemplateModule) => void;
  onUpdateModuleBackground: (updater: (background: BackgroundSettings) => BackgroundSettings) => void;
}) {
  function updateSetting(key: string, value: string) {
    onUpdateModule((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  const sort = normalizePollCategoryListSort(module.settings.categorySort);
  const listFlow = normalizePollCategoryListFlow(module.settings.categoryListFlow);

  return (
    <>
      <div className="builder-poll-category-list-module-chrome">
        <BuilderBackgroundControls
          label="Background"
          background={getModuleBackgroundSettings(module.settings)}
          horizontal
          onChange={onUpdateModuleBackground}
        />
        {!isPollCategoryListPanelTransparent(module.settings) ? (
          <BuilderSettingRow label="Panel Border" fullWidth>
            <input
              type="color"
              value={
                module.settings.panelBorderColor?.startsWith("#")
                  ? module.settings.panelBorderColor
                  : "#c6e8f5"
              }
              onChange={(event) => updateSetting("panelBorderColor", event.target.value)}
            />
          </BuilderSettingRow>
        ) : null}
      </div>
      <BuilderSettingRow label="Headline" fullWidth>
        <input
          type="text"
          value={module.settings.listTitle ?? POLL_CATEGORY_LIST_DEFAULT_TITLE}
          onChange={(event) => updateSetting("listTitle", event.target.value)}
        />
      </BuilderSettingRow>
      <BuilderSettingRow label="Sort" fullWidth>
        <select
          value={sort}
          onChange={(event) => updateSetting("categorySort", event.target.value as PollCategoryListSort)}
        >
          <option value="alphabetical">Alphabetical</option>
          <option value="canonical">Canonical</option>
        </select>
      </BuilderSettingRow>
      <BuilderSettingRow label="Default Layout" fullWidth>
        <select
          value={listFlow}
          onChange={(event) => updateSetting("categoryListFlow", event.target.value as PollCategoryListFlow)}
        >
          <option value="rows">By Row</option>
          <option value="columns">By Column</option>
        </select>
      </BuilderSettingRow>
      <BuilderSettingRow label="Font Size">
        <input
          type="number"
          min={10}
          max={120}
          value={module.settings.fontSize ?? POLL_CATEGORY_LIST_DEFAULT_FONT_SIZE}
          onChange={(event) => updateSetting("fontSize", event.target.value)}
        />
      </BuilderSettingRow>
      <BuilderSettingRow label="Color">
        <input
          type="text"
          value={module.settings.color ?? "#18324a"}
          onChange={(event) => updateSetting("color", event.target.value)}
          placeholder="#18324a"
        />
      </BuilderSettingRow>
      <BuilderSettingRow label="Bold">
        <input
          type="checkbox"
          checked={module.settings.bold !== "false"}
          onChange={(event) => updateSetting("bold", event.target.checked ? "true" : "false")}
        />
      </BuilderSettingRow>
      <BuilderSettingRow label="Alignment" fullWidth>
        <BuilderAlignmentIconGroup
          value={getModuleAlignment(module.settings)}
          onChange={(value) => updateSetting("alignment", value)}
        />
      </BuilderSettingRow>
      <BuilderSettingRow label="Item Gap">
        <input
          type="number"
          min={0}
          max={48}
          value={module.settings.itemGap ?? POLL_CATEGORY_LIST_DEFAULT_ITEM_GAP}
          onChange={(event) => updateSetting("itemGap", event.target.value)}
        />
      </BuilderSettingRow>
      <p className="builder-module-editor-copy">
        Lists seeded categories plus every category used on polls (same set as the Polls Manager filter). Each link
        opens the home page with that category filter.
      </p>
    </>
  );
}

