import { normalizeBuilderHexColor } from "@/lib/builder-hex-color";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { GameReward } from "@/lib/game-admin";
import type { PlayerPortalRewardVisual } from "@/lib/player-portal";

export const DEFAULT_REWARD_DISC_COLOR = "#d8212d";

export function buildRewardDiscVisualFromRecord(
  record: Record<string, unknown>,
  fallback: PlayerPortalRewardVisual
): PlayerPortalRewardVisual {
  return {
    visualType: String(record.visualType ?? fallback.visualType).trim() || fallback.visualType,
    visualColor: normalizeBuilderHexColor(String(record.visualColor ?? fallback.visualColor), fallback.visualColor),
    visualSize: String(record.visualSize ?? fallback.visualSize).trim() || fallback.visualSize,
    visualBorderColor: normalizeBuilderHexColor(
      String(record.visualBorderColor ?? fallback.visualBorderColor),
      fallback.visualBorderColor
    ),
    visualBorderWidth: String(record.visualBorderWidth ?? fallback.visualBorderWidth),
    visualSymbolUrl: normalizeBuilderAssetUrl(record.visualSymbolUrl)
  };
}

function getRewardVisualSource(metadata: Record<string, unknown>, key: "pollReward" | "levelReward") {
  const nested = metadata[key];

  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const record = nested as Record<string, unknown>;
    const hasNestedVisual =
      Boolean(String(record.visualColor ?? "").trim()) ||
      Boolean(String(record.visualSize ?? "").trim()) ||
      Boolean(String(record.visualType ?? "").trim()) ||
      Boolean(String(record.visualSymbolUrl ?? "").trim());

    if (hasNestedVisual) {
      return record;
    }
  }

  return key === "levelReward" ? metadata : {};
}

const DEFAULT_POLL_DISC: PlayerPortalRewardVisual = {
  visualType: "coin",
  visualColor: DEFAULT_REWARD_DISC_COLOR,
  visualSize: "10px",
  visualBorderColor: "",
  visualBorderWidth: "",
  visualSymbolUrl: ""
};

const DEFAULT_LEVEL_DISC: PlayerPortalRewardVisual = {
  ...DEFAULT_POLL_DISC,
  visualSize: "20px"
};

export function getGameRewardDiscVisual(
  reward: GameReward,
  key: "pollReward" | "levelReward"
): PlayerPortalRewardVisual {
  const fallback = key === "pollReward" ? DEFAULT_POLL_DISC : DEFAULT_LEVEL_DISC;
  return buildRewardDiscVisualFromRecord(getRewardVisualSource(reward.metadata, key), fallback);
}

export function buildRewardDiscVisualFromDraft(values: {
  visualType?: string;
  visualColor?: string;
  visualSize?: string;
  visualBorderColor?: string;
  visualBorderWidth?: string;
  visualSymbolUrl?: string;
}): PlayerPortalRewardVisual {
  return buildRewardDiscVisualFromRecord(
    {
      visualType: values.visualType,
      visualColor: values.visualColor,
      visualSize: values.visualSize,
      visualBorderColor: values.visualBorderColor,
      visualBorderWidth: values.visualBorderWidth,
      visualSymbolUrl: values.visualSymbolUrl
    },
    DEFAULT_POLL_DISC
  );
}
