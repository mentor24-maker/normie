import { describe, expect, it } from "vitest";
import { shouldSpeechBubbleUseOverlayRuntime } from "./builder-speech-bubble-runtime";

describe("shouldSpeechBubbleUseOverlayRuntime", () => {
  it("uses overlay runtime for game, on-load, and button triggers", () => {
    expect(shouldSpeechBubbleUseOverlayRuntime("game")).toBe(true);
    expect(shouldSpeechBubbleUseOverlayRuntime("on-load")).toBe(true);
    expect(shouldSpeechBubbleUseOverlayRuntime("button")).toBe(true);
  });
});
