import { describe, expect, it } from "vitest";
import {
  buildPollCategoryCatalog,
  buildPollsNextRequestUrl,
  buildPublicPollCategoryPath,
  buildPublicPollViewPath,
  getPollCategoryMeta,
  normalizePollCategoryForStorage,
  pollCategoriesEqual,
  POLL_CATEGORY_SEEDS,
  POLL_MANAGER_CATEGORY_NAMES,
  resolvePollCategoryName
} from "@/lib/poll-categories";

describe("poll category URL params", () => {
  it("resolves category slugs to stored poll category names", () => {
    expect(resolvePollCategoryName("self-perception")).toBe("Self-Perception");
    expect(resolvePollCategoryName("identity-psychology")).toBe("Identity & Psychology");
  });

  it("accepts canonical category names in the URL", () => {
    expect(resolvePollCategoryName("Self-Perception")).toBe("Self-Perception");
  });

  it("resolves uppercase and lowercase labels to the same canonical name", () => {
    expect(resolvePollCategoryName("SELF-PERCEPTION")).toBe("Self-Perception");
    expect(resolvePollCategoryName("identity & psychology")).toBe("Identity & Psychology");
    expect(pollCategoriesEqual("SELF-PERCEPTION", "self-perception")).toBe(true);
    expect(normalizePollCategoryForStorage("IDENTITY & PSYCHOLOGY")).toBe("Identity & Psychology");
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

  it("builds polls/next URL with category and startPoll", () => {
    expect(buildPollsNextRequestUrl(null, "550e8400-e29b-41d4-a716-446655440000")).toBe(
      "/api/polls/next?startPoll=550e8400-e29b-41d4-a716-446655440000"
    );
    expect(buildPollsNextRequestUrl("identity-psychology", "550e8400-e29b-41d4-a716-446655440000")).toBe(
      "/api/polls/next?category=identity-psychology&startPoll=550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("keeps poll manager seed names aligned with category seeds", () => {
    expect(POLL_CATEGORY_SEEDS.map((category) => category.name)).toEqual([...POLL_MANAGER_CATEGORY_NAMES]);
  });

  it("builds poll manager catalog with seeds first then poll-only names", () => {
    const catalog = buildPollCategoryCatalog(["Personality System B", "Money & Success"]);

    expect(catalog.map((category) => category.name)).toEqual([
      ...POLL_MANAGER_CATEGORY_NAMES,
      "Personality System B"
    ]);
  });

  it("builds home page path for a category filter", () => {
    expect(buildPublicPollCategoryPath({ slug: "dark-truth" })).toBe("/?category=dark-truth");
  });

  it("builds public poll view path with startPoll only", () => {
    expect(
      buildPublicPollViewPath({
        id: "550e8400-e29b-41d4-a716-446655440000"
      })
    ).toBe("/?startPoll=550e8400-e29b-41d4-a716-446655440000");
  });
});
