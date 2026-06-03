import { describe, expect, it } from "vitest";
import {
  buildPublicPollCategoryPath,
  POLL_CATEGORY_SEEDS
} from "@/lib/poll-categories";
import {
  buildPollCategoryListCatalog,
  buildPollCategoryListEntries,
  getPollCategoryListEntries,
  orderPollCategoryListForGrid,
  sortPollCategoriesForList
} from "@/lib/poll-category-list";

describe("poll category list", () => {
  it("sorts categories alphabetically by display name", () => {
    const sorted = sortPollCategoriesForList(POLL_CATEGORY_SEEDS, "alphabetical");
    const names = sorted.map((category) => category.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
    expect(names[0]).toBe("Absurd but Revealing");
  });

  it("keeps canonical seed order when requested", () => {
    expect(sortPollCategoriesForList(POLL_CATEGORY_SEEDS, "canonical")).toEqual([...POLL_CATEGORY_SEEDS]);
  });

  it("links each category to the home page with a category query", () => {
    const entry = getPollCategoryListEntries("canonical", POLL_CATEGORY_SEEDS).find(
      (category) => category.slug === "identity-psychology"
    );

    expect(entry?.href).toBe(buildPublicPollCategoryPath({ slug: "identity-psychology" }));
    expect(entry?.href).toBe("/?category=identity-psychology");
  });

  it("orders alphabetized categories down each column before the next", () => {
    const entries = buildPollCategoryListEntries(
      [
        { name: "Alpha", slug: "alpha" },
        { name: "Beta", slug: "beta" },
        { name: "Gamma", slug: "gamma" },
        { name: "Delta", slug: "delta" },
        { name: "Epsilon", slug: "epsilon" },
        { name: "Zeta", slug: "zeta" }
      ],
      "alphabetical"
    );

    expect(orderPollCategoryListForGrid(entries, "columns", 3).map((entry) => entry.name)).toEqual([
      "Alpha",
      "Delta",
      "Gamma",
      "Beta",
      "Epsilon",
      "Zeta"
    ]);
  });

  it("includes poll-only categories in the catalog", () => {
    const catalog = buildPollCategoryListCatalog(["Archetype Drill"]);
    const names = getPollCategoryListEntries("alphabetical", catalog).map((entry) => entry.name);

    expect(names).toContain("Archetype Drill");
    expect(names.length).toBe(POLL_CATEGORY_SEEDS.length + 1);
  });
});
