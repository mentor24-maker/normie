"use client";

import { PlayerGameFloatingImageHost } from "@/components/player-game-floating-image-host";
import { PlayerGameSpeechBubbleHost } from "@/components/player-game-speech-bubble-host";

/** Listens for game-layer overlay events (speech bubble, floating image) on any route. */
export function GameModuleOverlayHosts() {
  return (
    <>
      <PlayerGameFloatingImageHost />
      <PlayerGameSpeechBubbleHost />
    </>
  );
}
