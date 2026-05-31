import { describe, expect, it } from "vitest";
import {
  builderModuleShowsTriggerSettings,
  inferModuleClassFromBuilderModule,
  isGameEligibleSavedModule,
  isGameEventPickableModule,
  isGameLayerTriggeredModule,
  moduleClassSupportsTrigger,
  resolveModuleClassForBuilderModule
} from "@/lib/module-class-triggers";
import type { BuilderTemplateModule } from "@/lib/builder-template";

const confettiModule: BuilderTemplateModule = {
  id: "1",
  type: "confetti",
  column: "main",
  name: "Confetti",
  text: "",
  settings: { trigger: "game" }
};

const speechBubbleModule: BuilderTemplateModule = {
  id: "2",
  type: "speech-bubble",
  column: "main",
  name: "Normie Says",
  text: "",
  settings: { trigger: "game" }
};

describe("module class triggers", () => {
  it("enables trigger UI only for configured module classes", () => {
    expect(moduleClassSupportsTrigger("Special Effects")).toBe(true);
    expect(moduleClassSupportsTrigger("Speech Bubble")).toBe(true);
    expect(moduleClassSupportsTrigger("Headings")).toBe(false);
  });

  it("infers special effects class for confetti modules", () => {
    expect(inferModuleClassFromBuilderModule(confettiModule)).toBe("Special Effects");
  });

  it("infers speech bubble class for speech bubble modules", () => {
    expect(inferModuleClassFromBuilderModule(speechBubbleModule)).toBe("Speech Bubble");
  });

  it("shows trigger settings for speech bubble modules by type", () => {
    expect(builderModuleShowsTriggerSettings(speechBubbleModule)).toBe(true);
  });

  it("detects game-layer triggered saved modules", () => {
    expect(
      isGameLayerTriggeredModule("Special Effects", { trigger: "game" })
    ).toBe(true);
    expect(
      isGameLayerTriggeredModule("Speech Bubble", { trigger: "game" })
    ).toBe(true);
    expect(
      isGameLayerTriggeredModule("Headings", { trigger: "game" })
    ).toBe(false);
    expect(
      isGameLayerTriggeredModule("Headings", { trigger: "game" }, "speech-bubble")
    ).toBe(true);
    expect(
      isGameLayerTriggeredModule("Special Effects", { trigger: "button" })
    ).toBe(false);
  });

  it("lists game-triggered special effects and speech bubble modules", () => {
    expect(
      isGameEventPickableModule({
        moduleClass: "Special Effects",
        settings: { trigger: "game" }
      })
    ).toBe(true);
    expect(
      isGameEventPickableModule({
        moduleClass: "Speech Bubble",
        settings: { trigger: "game" },
        moduleType: "speech-bubble"
      })
    ).toBe(true);
  });

  it("does not require confetti module type for event picker eligibility", () => {
    expect(
      isGameEligibleSavedModule({
        moduleClass: "Special Effects",
        moduleType: "floating-image",
        settings: { trigger: "game" }
      })
    ).toBe(true);
    expect(
      isGameEligibleSavedModule({
        moduleClass: "Special Effects",
        moduleType: "heading",
        settings: { trigger: "game" }
      })
    ).toBe(true);
    expect(
      isGameEligibleSavedModule({
        moduleClass: "Speech Bubble",
        moduleType: "speech-bubble",
        settings: { trigger: "game" }
      })
    ).toBe(true);
  });

  it("lists game-triggered speech bubble modules saved with slug class names", () => {
    expect(
      isGameEventPickableModule({
        moduleClass: "speech-bubble",
        settings: {},
        moduleType: "speech-bubble"
      })
    ).toBe(false);

    expect(
      isGameEventPickableModule({
        moduleClass: "speech-bubble",
        settings: { trigger: "game" },
        moduleType: "speech-bubble"
      })
    ).toBe(true);

    expect(moduleClassSupportsTrigger("speech-bubble")).toBe(true);
  });
});
