import { describe, expect, it } from "vitest";
import {
  buildPollGalleryImageUrl,
  pollHasGalleryImageLink,
  resolvePollGalleryStorageName
} from "@/lib/poll-gallery-link-core";

describe("poll gallery link core", () => {
  it("builds canonical gallery image paths", () => {
    expect(buildPollGalleryImageUrl("beatles-vs-stones.png")).toBe("/gallery/beatles-vs-stones.png");
  });

  it("resolves gallery paths from poll image_url values", () => {
    expect(resolvePollGalleryStorageName("/gallery/beatles-vs-stones.png")).toBe("beatles-vs-stones.png");
    expect(
      resolvePollGalleryStorageName(
        "https://example.supabase.co/storage/v1/object/public/gallery/beatles-vs-stones.png"
      )
    ).toBe("beatles-vs-stones.png");
    expect(
      resolvePollGalleryStorageName(
        "https://example.supabase.co/storage/v1/render/image/public/gallery/beatles-vs-stones.png?width=75"
      )
    ).toBe("beatles-vs-stones.png");
    expect(resolvePollGalleryStorageName("/api/admin/media-file/gallery/beatles-vs-stones.png")).toBe(
      "beatles-vs-stones.png"
    );
  });

  it("does not treat bare filenames as gallery links", () => {
    expect(resolvePollGalleryStorageName("beatles-vs-stones.png")).toBe("");
    expect(pollHasGalleryImageLink("beatles-vs-stones.png")).toBe(false);
  });

  it("treats non-gallery urls as unlinked", () => {
    expect(pollHasGalleryImageLink("https://cdn.example.com/photo.jpg")).toBe(false);
    expect(pollHasGalleryImageLink("")).toBe(false);
  });

  it("matches poll and gallery filters for gallery-linked polls", () => {
    expect(pollHasGalleryImageLink("/gallery/beatles-vs-stones.png")).toBe(true);
  });
});
