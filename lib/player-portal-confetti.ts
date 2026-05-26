import type confetti from "canvas-confetti";
import type { Options } from "canvas-confetti";
import { appendPlayerLevelUpDiagnostic } from "@/lib/player-level-up-diagnostics";

/** Above portal chrome, modals, and builder overlays (site uses up to ~1100). */
export const PLAYER_PORTAL_CONFETTI_Z_INDEX = 12000;

const CONFETTI_BURST: Options = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  zIndex: PLAYER_PORTAL_CONFETTI_Z_INDEX,
  disableForReducedMotion: false
};

type ConfettiBurst = (options?: Options) => Promise<undefined> | null;
type ConfettiFactory = typeof confetti;

let confettiPromise: Promise<ConfettiFactory> | null = null;

function loadConfetti(): Promise<ConfettiFactory> {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then((module) => {
      const confettiFactory = (module.default ?? module) as ConfettiFactory;

      if (typeof confettiFactory !== "function") {
        throw new TypeError("canvas-confetti did not provide a callable export.");
      }

      return confettiFactory;
    });
  }

  return confettiPromise;
}

function createConfettiCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.display = "block";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = String(PLAYER_PORTAL_CONFETTI_Z_INDEX);
  document.body.appendChild(canvas);

  return canvas;
}

function removeCanvasAfterBurst(canvas: HTMLCanvasElement) {
  window.setTimeout(() => {
    canvas.remove();
    appendPlayerLevelUpDiagnostic("confetti.canvas.removed");
  }, 2200);
}

/**
 * Level-up celebration burst (canvas-confetti@1.9.3).
 * Settings match docs/Handoffs/confetti.js, with a high z-index so particles
 * paint above the player portal layout.
 */
export async function firePlayerLevelUpConfetti(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    appendPlayerLevelUpDiagnostic("confetti.fire.started");
    const confettiFactory = await loadConfetti();
    appendPlayerLevelUpDiagnostic("confetti.module.loaded");
    const canvas = createConfettiCanvas();
    const burst = confettiFactory.create(canvas, {
      resize: true,
      useWorker: false
    }) as ConfettiBurst;
    appendPlayerLevelUpDiagnostic("confetti.canvas.created", {
      zIndex: PLAYER_PORTAL_CONFETTI_Z_INDEX
    });
    const result = burst(CONFETTI_BURST);

    if (result && typeof result.then === "function") {
      await result;
    }
    removeCanvasAfterBurst(canvas);
    appendPlayerLevelUpDiagnostic("confetti.fire.complete");
  } catch (error) {
    appendPlayerLevelUpDiagnostic("confetti.fire.error", {
      message: error instanceof Error ? error.message : String(error)
    });
    console.error("[player-portal-confetti] Failed to fire confetti.", error);
  }
}
