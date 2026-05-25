import type { CSSProperties } from "react";
import {
  createDefaultBackgroundSettings,
  getBuilderBackgroundStyle,
  type BackgroundSettings
} from "@/lib/builder-template";

export type BuilderDrillDownSurfaceTier = "workspace" | "section" | "cell" | "module";

const BUILDER_SURFACE_VAR: Record<BuilderDrillDownSurfaceTier, string> = {
  workspace: "--builder-bg-workspace",
  section: "--builder-bg-section",
  cell: "--builder-bg-cell",
  module: "--builder-bg-module"
};

const LIGHT_CELL_FILL_COLORS = new Set([
  "#ffffff",
  "#fff",
  "#f8fdff",
  "#f6fbff",
  "#eaf4ff",
  "#e8f5e9",
  "#f0fdf4",
  "#ecfdf5"
]);

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed.startsWith("#")) {
    return trimmed;
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  return trimmed;
}

/** Decorative or near-white cell fills break the builder drill-down gradient — use tier tokens instead. */
export function usesBuilderDrillDownSurfaceDefault(background: BackgroundSettings | undefined) {
  if (!background || background.mode === "none") {
    return true;
  }

  if (background.mode === "style") {
    return true;
  }

  if (background.mode === "color") {
    return LIGHT_CELL_FILL_COLORS.has(normalizeHexColor(background.color));
  }

  return false;
}

export function sanitizeCellBackgroundForDrillDown(background: BackgroundSettings): BackgroundSettings {
  if (usesBuilderDrillDownSurfaceDefault(background)) {
    return createDefaultBackgroundSettings();
  }

  return background;
}

export function resolveBuilderDrillDownSurfaceBackground(
  background: BackgroundSettings | undefined,
  tier: BuilderDrillDownSurfaceTier
): CSSProperties {
  if (usesBuilderDrillDownSurfaceDefault(background)) {
    return { background: `var(${BUILDER_SURFACE_VAR[tier]})` };
  }

  return getBuilderBackgroundStyle(background) ?? { background: `var(${BUILDER_SURFACE_VAR[tier]})` };
}
