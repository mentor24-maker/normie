import { describe, expect, it } from "vitest";
import { getPollCategoryListPanelStyle } from "@/components/builder/builder-utils";

describe("getPollCategoryListPanelStyle", () => {
  it("returns transparent panel styles when background mode is none", () => {
    expect(
      getPollCategoryListPanelStyle({
        backgroundMode: "none",
        backgroundColor: "#e8f6fc",
        panelBorderColor: "#c6e8f5"
      })
    ).toEqual({
      background: "transparent",
      backgroundColor: "transparent",
      backgroundImage: "none",
      boxShadow: "none",
      border: "none",
      borderRadius: undefined
    });
  });

  it("applies color background when background mode is color", () => {
    expect(
      getPollCategoryListPanelStyle({
        backgroundMode: "color",
        backgroundColor: "#e8f6fc",
        panelBorderColor: "#c6e8f5"
      })
    ).toMatchObject({
      background: "#e8f6fc",
      borderRadius: "12px",
      border: "1px solid #c6e8f5"
    });
  });
});
