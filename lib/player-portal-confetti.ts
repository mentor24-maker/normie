import { CONFETTI_EFFECT_DEFAULTS, confettiBurstFromModuleSettings } from "@/lib/confetti-effect";
import type { PlayerPortalLevelEvent } from "@/lib/player-portal";

export { PLAYER_PORTAL_CONFETTI_Z_INDEX } from "@/lib/confetti-effect";

/** Level-up burst using handoff defaults (see docs/Handoffs/confetti.js). */
export async function firePlayerLevelUpConfetti(): Promise<void> {
  const { fireConfettiBurst } = await import("@/lib/confetti-burst");
  await fireConfettiBurst(confettiBurstFromModuleSettings(CONFETTI_EFFECT_DEFAULTS));
}

function eventMatchesCompletedLevel(event: PlayerPortalLevelEvent, completedLevelRewards?: number | null) {
  if (!completedLevelRewards) {
    return true;
  }

  const sublevelNumber = Number.parseInt(String(event.sublevelName ?? "").trim(), 10);

  return Number.isFinite(sublevelNumber) && sublevelNumber === completedLevelRewards;
}

export async function firePlayerLevelUpGameEvents(
  levelEvents: PlayerPortalLevelEvent[],
  completedLevelRewards?: number | null
): Promise<void> {
  const gameConfettiEvents = levelEvents.filter(
    (event) =>
      event.trigger === "game" &&
      event.moduleType === "confetti" &&
      eventMatchesCompletedLevel(event, completedLevelRewards)
  );

  if (!gameConfettiEvents.length) {
    if (levelEvents.length === 0) {
      await firePlayerLevelUpConfetti();
    }
    return;
  }

  const { fireConfettiFromModuleSettings } = await import("@/lib/confetti-game-trigger");

  for (const event of gameConfettiEvents) {
    await fireConfettiFromModuleSettings(event.moduleSettings);
  }
}
