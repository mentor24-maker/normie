"use client";

import { type CSSProperties } from "react";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { PlayerPortalRewardVisual } from "@/lib/player-portal";

export function rewardDiscStyle(visual: PlayerPortalRewardVisual, isEarned = true): CSSProperties {
  const borderWidth = visual.visualBorderWidth || "0";

  return {
    width: visual.visualSize,
    height: visual.visualSize,
    background: isEarned ? visual.visualColor : "transparent",
    borderColor: isEarned ? visual.visualBorderColor || visual.visualColor : "#cbd5e1",
    borderWidth: isEarned ? borderWidth : "1px"
  };
}

export function RewardDiscPreview({
  visual,
  isEarned = true,
  className = "player-portal-reward-disk",
  ariaLabel,
  title
}: {
  visual: PlayerPortalRewardVisual;
  isEarned?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const symbolUrl = isEarned ? normalizeBuilderAssetUrl(visual.visualSymbolUrl) : "";

  return (
    <span aria-label={ariaLabel} className="player-portal-reward-disc-shell" title={title}>
      <span className={`${className}${isEarned ? " is-earned" : ""}`} role="img" style={rewardDiscStyle(visual, isEarned)} />
      {symbolUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className="player-portal-reward-disc-symbol"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          src={symbolUrl}
        />
      ) : null}
    </span>
  );
}
