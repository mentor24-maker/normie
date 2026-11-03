import { describe, expect, it } from "vitest";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";

describe("getGalleryMediaThumbnailUrl", () => {
  it("rewrites Supabase public gallery object URLs to render/image transforms", () => {
    expect(
      getGalleryMediaThumbnailUrl(
        "https://example.supabase.co/storage/v1/object/public/gallery/logo_normie_4-240101.png"
      )
    ).toBe(
      "https://example.supabase.co/storage/v1/render/image/public/gallery/logo_normie_4-240101.png?width=180&height=180&resize=contain"
    );
  });

  it("returns relative gallery paths unchanged", () => {
    expect(getGalleryMediaThumbnailUrl("/gallery/social-x.svg")).toBe("/gallery/social-x.svg");
  });
});
