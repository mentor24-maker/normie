import { describe, expect, it } from "vitest";
import { mergeGalleryMediaBadges } from "@/lib/gallery-media";
import { getGalleryStorageName } from "@/lib/gallery-storage-name";
import type { AdminMediaItem } from "@/lib/admin-media";

describe("getGalleryStorageName", () => {
  it("extracts storage names from public gallery urls and relative paths", () => {
    expect(getGalleryStorageName("https://example.supabase.co/storage/v1/object/public/gallery/wave.png")).toBe(
      "wave.png"
    );
    expect(getGalleryStorageName("/gallery/wave.png")).toBe("wave.png");
    expect(getGalleryStorageName("gallery/wave.png")).toBe("wave.png");
    expect(getGalleryStorageName("wave.png")).toBe("");
  });
});

describe("mergeGalleryMediaBadges", () => {
  it("applies badge flags from gallery_media records", () => {
    const media: AdminMediaItem[] = [
      {
        name: "wave.png",
        path: "https://example.supabase.co/storage/v1/object/public/gallery/wave.png",
        directory: "gallery",
        kind: "image",
        extension: ".png"
      }
    ];

    const merged = mergeGalleryMediaBadges(media, [
      {
        storage_name: "wave.png",
        badge: true,
        media_category: "Dark / Truth",
        media_type: "WYR Poster",
        aspect: "wide",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(merged[0]?.badge).toBe(true);
    expect(merged[0]?.storageName).toBe("wave.png");
    expect(merged[0]?.mediaCategory).toBe("Dark / Truth");
    expect(merged[0]?.mediaType).toBe("WYR Poster");
    expect(merged[0]?.aspect).toBe("wide");
  });
});
