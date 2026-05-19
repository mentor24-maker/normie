import { describe, expect, it } from "vitest";
import {
  columnHasOnlyOverlayImageModules,
  getHeadingModuleStyle,
  getImageModuleShellStyle,
  getOverlayFlowCollapsedModuleStyle,
  getOverlayFlowCollapsedSectionStyle,
  isFloatingImageModule,
  isOverlayImageModule,
  sectionHasOnlyOverlayImageModules
} from "@/components/builder/builder-utils";

describe("overlay flow collapse helpers", () => {
  it("detects floating image modules", () => {
    expect(
      isFloatingImageModule({
        type: "floating-image",
        settings: {}
      } as never)
    ).toBe(true);
    expect(
      isOverlayImageModule({
        type: "floating-image",
        settings: {}
      } as never)
    ).toBe(true);
    expect(
      isOverlayImageModule({
        type: "image",
        settings: { positionMode: "overlay", variant: "image" }
      } as never)
    ).toBe(true);
    expect(
      isOverlayImageModule({
        type: "image",
        settings: { positionMode: "inline", variant: "image" }
      } as never)
    ).toBe(false);
  });

  it("collapses section layout box for floating-only sections", () => {
    const section = {
      modules: [{ type: "floating-image", settings: {} }]
    } as never;

    expect(sectionHasOnlyOverlayImageModules(section)).toBe(true);
    expect(getOverlayFlowCollapsedSectionStyle(true)).toEqual({
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      minHeight: 0,
      overflow: "visible"
    });
    expect(getOverlayFlowCollapsedModuleStyle(true).height).toBe(0);
  });

  it("does not collapse sections that mix overlay and inline modules", () => {
    const section = {
      modules: [
        { type: "image", settings: { positionMode: "overlay" } },
        { type: "text", settings: {} }
      ]
    } as never;

    expect(sectionHasOnlyOverlayImageModules(section)).toBe(false);
    expect(
      columnHasOnlyOverlayImageModules([
        { type: "image", settings: { positionMode: "overlay" } } as never
      ])
    ).toBe(true);
  });
});

describe("getImageModuleShellStyle", () => {
  it("nudges inline images using signed horizontal and vertical offsets", () => {
    const style = getImageModuleShellStyle({
      positionMode: "inline",
      horizontalOffset: "12",
      verticalOffset: "8"
    });

    expect(style.transform).toBe("translate(12px, -8px)");
    expect(style.position).toBe("relative");
  });

  it("appends nudge transforms after overlay anchor transforms", () => {
    const style = getImageModuleShellStyle({
      positionMode: "overlay",
      overlayAnchor: "center",
      offsetX: "0",
      offsetY: "0",
      horizontalOffset: "-6",
      verticalOffset: "10"
    });

    expect(style.transform).toContain("translate(calc(-50% + 0px), calc(-50% + 0px))");
    expect(style.transform).toContain("translate(-6px, -10px)");
  });
});

describe("getHeadingModuleStyle", () => {
  it("nudges headings using signed horizontal and vertical offsets", () => {
    const style = getHeadingModuleStyle({
      fontSize: "32",
      horizontalOffset: "12",
      verticalOffset: "8"
    });

    expect(style.transform).toBe("translate(12px, -8px)");
    expect(style.position).toBe("relative");
    expect(style.marginBottom).toBe("-8px");
  });
});
