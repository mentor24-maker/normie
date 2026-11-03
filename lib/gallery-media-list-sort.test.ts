import { describe, expect, it } from "vitest";
import {
  galleryMediaListAriaSort,
  galleryMediaListSortState,
  nextGalleryMediaListSort
} from "@/lib/gallery-media-list-sort";

describe("galleryMediaListSortState", () => {
  it("maps gallery sort values back to a column and direction", () => {
    expect(galleryMediaListSortState("name_asc")).toEqual({ key: "name", direction: "asc" });
    expect(galleryMediaListSortState("category_desc")).toEqual({ key: "category", direction: "desc" });
    expect(galleryMediaListSortState("newest")).toEqual({ key: "createdAt", direction: "desc" });
    expect(galleryMediaListSortState("oldest")).toEqual({ key: "createdAt", direction: "asc" });
  });
});

describe("nextGalleryMediaListSort", () => {
  it("sorts a new column ascending and Create Date newest-first", () => {
    expect(nextGalleryMediaListSort("name_asc", "category")).toBe("category_asc");
    expect(nextGalleryMediaListSort("name_asc", "type")).toBe("type_asc");
    expect(nextGalleryMediaListSort("name_asc", "createdAt")).toBe("newest");
  });

  it("flips direction when the active column is clicked again", () => {
    expect(nextGalleryMediaListSort("name_asc", "name")).toBe("name_desc");
    expect(nextGalleryMediaListSort("name_desc", "name")).toBe("name_asc");
    expect(nextGalleryMediaListSort("newest", "createdAt")).toBe("oldest");
    expect(nextGalleryMediaListSort("aspect_asc", "aspect")).toBe("aspect_desc");
  });
});

describe("galleryMediaListAriaSort", () => {
  it("reports the sorted column only", () => {
    expect(galleryMediaListAriaSort("type_desc", "type")).toBe("descending");
    expect(galleryMediaListAriaSort("type_desc", "name")).toBe("none");
    expect(galleryMediaListAriaSort("oldest", "createdAt")).toBe("ascending");
  });
});
