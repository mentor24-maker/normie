import { describe, expect, it } from "vitest";
import { getPollCategoryMeta, resolvePollCategoryName } from "@/lib/poll-categories";

describe("poll category URL params", () => {
  it("resolves category slugs to stored poll category names", () => {
    expect(resolvePollCategoryName("self-perception")).toBe("Self-Perception");
    expect(resolvePollCategoryName("identity-psychology")).toBe("Identity & Psychology");
  });

  it("accepts canonical category names in the URL", () => {
    expect(resolvePollCategoryName("Self-Perception")).toBe("Self-Perception");
  });

  it("maps known aliases used in navigation", () => {
    expect(resolvePollCategoryName("future-and-past")).toBe("Future / Power");
  });

  it("returns category meta for headlines and API responses", () => {
    expect(getPollCategoryMeta("self-perception")).toEqual({
      name: "Self-Perception",
      slug: "self-perception"
    });
  });
});
