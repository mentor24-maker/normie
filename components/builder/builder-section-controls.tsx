"use client";

import type { BuilderTemplateLayout, BuilderTemplateSection } from "@/lib/builder-template";
import { getLayoutColumns } from "@/lib/builder-template";
import { BuilderBackgroundControls } from "./builder-background-controls";
import { BuilderNumberSelectControl } from "./builder-inline-number-select";
import { layoutOptions } from "./builder-types";
import { BuilderSettingRow } from "./builder-setting-row";

type BuilderSectionControlsProps = {
  section: BuilderTemplateSection;
  editorDevice: "browser" | "mobile";
  onUpdateSection: (updater: (section: BuilderTemplateSection) => BuilderTemplateSection) => void;
  onOpenSectionBackgroundGallery?: () => void;
  onUploadSectionBackgroundMedia?: (file: File | null) => void;
};

export function BuilderSectionControls({
  section,
  editorDevice,
  onUpdateSection,
  onOpenSectionBackgroundGallery,
  onUploadSectionBackgroundMedia
}: BuilderSectionControlsProps) {
  if (editorDevice === "mobile") {
    return (
      <div className="builder-section-settings">
        <BuilderSettingRow label="Mobile Layout" fullWidth>
          <select
            value={section.mobileLayout ?? "stack"}
            onChange={(event) =>
              onUpdateSection((current) => ({
                ...current,
                mobileLayout: event.target.value as BuilderTemplateSection["mobileLayout"]
              }))
            }
          >
            <option value="stack">Stack columns</option>
            <option value="keep">Keep columns</option>
            <option value="reverse-stack">Reverse stack</option>
          </select>
        </BuilderSettingRow>
        <div className="builder-mobile-context-note">
          Mobile mode only changes mobile-specific row, cell, and module overrides.
        </div>
      </div>
    );
  }

  return (
    <div className="builder-section-settings">
      <div className="builder-button-setting-columns">
        <div className="builder-button-setting-column">
          <BuilderSettingRow label="Layout">
            <select
              value={section.layout}
              onChange={(event) => {
                const nextLayout = event.target.value as BuilderTemplateLayout;
                const allowedColumns = new Set(getLayoutColumns(nextLayout));
                onUpdateSection((current) => ({
                  ...current,
                  layout: nextLayout,
                  modules: current.modules.map((module) => ({
                    ...module,
                    column: allowedColumns.has(module.column) ? module.column : getLayoutColumns(nextLayout)[0]
                  }))
                }));
              }}
            >
              {layoutOptions.map((layout) => (
                <option key={layout.value} value={layout.value}>
                  {layout.label}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow label="Top Margin">
            <BuilderNumberSelectControl
              value={section.marginTop ?? "0"}
              min={0}
              max={160}
              fallback="0"
              onChange={(marginTop) =>
                onUpdateSection((current) => ({
                  ...current,
                  marginTop
                }))
              }
            />
          </BuilderSettingRow>
        </div>
        <div className="builder-button-setting-column">
          <BuilderSettingRow label="Alignment">
            <select
              value={section.alignment}
              onChange={(event) =>
                onUpdateSection((current) => ({
                  ...current,
                  alignment: event.target.value as "left" | "center" | "right"
                }))
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow label="Bottom Margin">
            <BuilderNumberSelectControl
              value={section.marginBottom ?? "0"}
              min={0}
              max={160}
              fallback="0"
              onChange={(marginBottom) =>
                onUpdateSection((current) => ({
                  ...current,
                  marginBottom
                }))
              }
            />
          </BuilderSettingRow>
        </div>
      </div>
      <BuilderBackgroundControls
        label="Row Background"
        background={section.background}
        horizontal
        onChange={(updater) =>
          onUpdateSection((current) => ({ ...current, background: updater(current.background) }))
        }
        onChooseImage={onOpenSectionBackgroundGallery}
        onUploadImage={onUploadSectionBackgroundMedia}
      />
    </div>
  );
}
