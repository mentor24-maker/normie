import { describe, expect, it } from "vitest";
import {
  galleryMediaAspectFromDimensions,
  normalizeGalleryMediaAspect
} from "@/lib/gallery-media-aspect";

describe("normalizeGalleryMediaAspect", () => {
  it("accepts tall, wide, and square", () => {
    expect(normalizeGalleryMediaAspect("tall")).toBe("tall");
    expect(normalizeGalleryMediaAspect("wide")).toBe("wide");
    expect(normalizeGalleryMediaAspect("square")).toBe("square");
  });

  it("defaults invalid values to square", () => {
    expect(normalizeGalleryMediaAspect("portrait")).toBe("square");
  });
});

describe("galleryMediaAspectFromDimensions", () => {
  it("classifies landscape, portrait, and near-square images", () => {
    expect(galleryMediaAspectFromDimensions(1920, 1080)).toBe("wide");
    expect(galleryMediaAspectFromDimensions(1080, 1920)).toBe("tall");
    expect(galleryMediaAspectFromDimensions(800, 800)).toBe("square");
    expect(galleryMediaAspectFromDimensions(1000, 950)).toBe("square");
  });

  it("falls back to square for unusable dimensions", () => {
    expect(galleryMediaAspectFromDimensions(0, 100)).toBe("square");
    expect(galleryMediaAspectFromDimensions(Number.NaN, 100)).toBe("square");
  });
});
