import { describe, expect, it } from "vitest";
import {
  buildPollsNextRequestUrl,
  buildPublicPollViewPath,
  getPollCategoryMeta,
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

  it("builds public poll view path with category slug", () => {
    expect(
      buildPublicPollViewPath({
        id: "550e8400-e29b-41d4-a716-446655440000",
        category: "Identity & Psychology"
      })
    ).toBe("/?startPoll=550e8400-e29b-41d4-a716-446655440000&category=identity-psychology");
  });
});
