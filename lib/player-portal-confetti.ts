import confetti from "canvas-confetti";

/**
 * Level-up celebration burst (canvas-confetti@1.9.3).
 * Settings match docs/Handoffs/confetti.js.
 */
export function firePlayerLevelUpConfetti(): void {
  if (typeof window === "undefined") {
    return;
  }

  void confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
