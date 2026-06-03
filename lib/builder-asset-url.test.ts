import { describe, expect, it } from "vitest";
import { galleryAssetPathFromUrl, normalizeBuilderAssetUrl } from "@/lib/builder-asset-url";

describe("normalizeBuilderAssetUrl", () => {
  it("normalizes Supabase gallery object URLs to /gallery paths", () => {
    expect(
      normalizeBuilderAssetUrl(
        "https://project.supabase.co/storage/v1/object/public/gallery/wave-401685.png"
      )
    ).toBe("/gallery/wave-401685.png");
  });

  it("normalizes Supabase render URLs to /gallery paths", () => {
    expect(
      normalizeBuilderAssetUrl(
        "https://project.supabase.co/storage/v1/render/image/public/gallery/wave-401685.png?width=75"
      )
    ).toBe("/gallery/wave-401685.png");
  });

  it("keeps normie site gallery paths", () => {
    expect(normalizeBuilderAssetUrl("https://www.normie.one/gallery/wave.png")).toBe("/gallery/wave.png");
    expect(normalizeBuilderAssetUrl("https://normie.one/gallery/wave.png")).toBe("/gallery/wave.png");
  });
});

describe("galleryAssetPathFromUrl", () => {
  it("extracts nested gallery folders", () => {
    const url = new URL("https://project.supabase.co/storage/v1/object/public/gallery/Dark%20Truth/wave.png");
    expect(galleryAssetPathFromUrl(url)).toBe("/gallery/Dark Truth/wave.png");
  });
});
