import { describe, expect, it } from "vitest";
import {
  buildGalleryUploadFileName,
  galleryUploadSuffixSixDigits,
  isLegacyGalleryTimestampPrefixName,
  legacyGalleryFileNameToNewName
} from "@/lib/gallery-upload-filename";

describe("buildGalleryUploadFileName", () => {
  it("places a six-digit suffix before the extension", () => {
    expect(buildGalleryUploadFileName("hero_banner", ".PNG", 1780080401685)).toBe("hero_banner-401685.png");
  });

  it("uses the last six digits of the current time", () => {
    expect(galleryUploadSuffixSixDigits(1780080401685)).toBe("401685");
  });
});

describe("legacyGalleryFileNameToNewName", () => {
  it("moves the timestamp from prefix to a six-digit suffix", () => {
    expect(legacyGalleryFileNameToNewName("1780080401685-icon_standard_200x200.png")).toBe(
      "icon_standard_200x200-401685.png"
    );
  });

  it("ignores files that never used the legacy prefix", () => {
    expect(legacyGalleryFileNameToNewName("wave.png")).toBeNull();
    expect(isLegacyGalleryTimestampPrefixName("wave.png")).toBe(false);
  });
});
