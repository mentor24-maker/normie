import { describe, expect, it } from "vitest";
import {
  escapeIlikePattern,
  galleryMediaQueryUsesServerFilters,
  normalizeGalleryExtensionFilter,
  parseGalleryMediaQueryParams
} from "@/lib/gallery-media-query-params";

describe("parseGalleryMediaQueryParams", () => {
  it("parses indexed gallery library queries with defaults", () => {
    const params = parseGalleryMediaQueryParams(
      new URLSearchParams("indexed=1&filename=wave&extension=png&kind=image&badge=yes&sort=newest&limit=24&offset=48")
    );

    expect(params).toEqual({
      filename: "wave",
      extension: ".png",
      kind: "image",
      badge: "yes",
      mediaCategory: "",
      mediaType: "",
      aspect: "",
      hasPoll: "",
      notFilename: false,
      notExtension: false,
      notKind: false,
      notMediaCategory: false,
      notMediaType: false,
      notAspect: false,
      sort: "newest",
      limit: 24,
      offset: 48,
      sync: false,
      indexed: true
    });
  });

  it("rejects unknown extensions and invalid sort values", () => {
    const params = parseGalleryMediaQueryParams(
      new URLSearchParams("extension=.exe&sort=invalid&limit=9999")
    );

    expect(params.extension).toBe("");
    expect(params.sort).toBe("name_asc");
    expect(params.limit).toBe(200);
    expect(params.indexed).toBe(false);
  });
});

describe("normalizeGalleryExtensionFilter", () => {
  it("normalizes extension values with or without a leading dot", () => {
    expect(normalizeGalleryExtensionFilter("PNG")).toBe(".png");
    expect(normalizeGalleryExtensionFilter(".webp")).toBe(".webp");
    expect(normalizeGalleryExtensionFilter("exe")).toBe("");
  });
});

describe("escapeIlikePattern", () => {
  it("escapes ilike wildcard characters", () => {
    expect(escapeIlikePattern("100%_done")).toBe("100\\%\\_done");
  });
});

describe("galleryMediaQueryUsesServerFilters", () => {
  it("uses indexed queries for the gallery library UI", () => {
    expect(
      galleryMediaQueryUsesServerFilters({
        filename: "",
        extension: "",
        kind: "",
        badge: "",
        mediaCategory: "",
        mediaType: "",
        aspect: "",
        hasPoll: "",
        notFilename: false,
        notExtension: false,
        notKind: false,
        notMediaCategory: false,
        notMediaType: false,
        notAspect: false,
        sort: "name_asc",
        limit: 48,
        offset: 0,
        sync: false,
        indexed: true
      })
    ).toBe(true);
  });
});
