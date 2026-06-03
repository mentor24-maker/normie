import { describe, expect, it } from "vitest";
import {
  formatGalleryDisplayFileName,
  galleryFileNameToQuestionHint,
  parseGalleryUploadFileName
} from "@/lib/gallery-display-filename";

describe("parseGalleryUploadFileName", () => {
  it("splits stem from six-digit suffix and extension", () => {
    expect(parseGalleryUploadFileName("hero_banner-401685.png")).toEqual({
      stem: "hero_banner",
      tail: "-401685.png"
    });
  });

  it("returns null for names without the upload suffix pattern", () => {
    expect(parseGalleryUploadFileName("wave.png")).toBeNull();
  });
});

describe("formatGalleryDisplayFileName", () => {
  it("keeps short stems intact", () => {
    expect(formatGalleryDisplayFileName("icon_standard-401685.png")).toBe("icon_standard-401685.png");
  });

  it("inserts ellipsis before the unique suffix when the stem is long", () => {
    const longStem = "a".repeat(50);
    expect(formatGalleryDisplayFileName(`${longStem}-401685.png`, 10)).toBe(
      `${"a".repeat(10)}...-401685.png`
    );
  });

  it("normalizes legacy timestamp-prefixed names for display", () => {
    expect(formatGalleryDisplayFileName("1780080401685-icon_standard_200x200.png", 80)).toBe(
      "icon_standard_200x200-401685.png"
    );
  });
});

describe("galleryFileNameToQuestionHint", () => {
  it("title-cases the upload stem for a manual question starting point", () => {
    expect(galleryFileNameToQuestionHint("hero_banner-401685.png")).toBe("Hero Banner");
  });
});
