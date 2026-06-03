import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePollTableThumbnailSrc } from "@/lib/poll-table-thumbnail";

describe("resolvePollTableThumbnailSrc", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses Supabase transform URLs for gallery-linked polls", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(resolvePollTableThumbnailSrc("/gallery/wyr-poster.png")).toBe(
      "https://project.supabase.co/storage/v1/render/image/public/gallery/wyr-poster.png?width=75&height=75&resize=contain"
    );
  });

  it("falls back to public gallery path when Supabase env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(resolvePollTableThumbnailSrc("/gallery/wyr-poster.png")).toBe("/gallery/wyr-poster.png");
  });

  it("returns empty string when image url is missing", () => {
    expect(resolvePollTableThumbnailSrc("")).toBe("");
  });
});
