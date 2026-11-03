import { describe, expect, it } from "vitest";
import { isPollVisibleOnSite, pollStatusLabel } from "@/lib/poll-visibility";

describe("poll visibility", () => {
  it("treats hidden published polls as not visible on site", () => {
    expect(isPollVisibleOnSite({ is_published: true, is_hidden: true })).toBe(false);
  });

  it("labels hidden polls before published or draft", () => {
    expect(pollStatusLabel({ is_published: true, is_hidden: true })).toBe("Hidden");
    expect(pollStatusLabel({ is_published: true, is_hidden: false })).toBe("Published");
    expect(pollStatusLabel({ is_published: false, is_hidden: false })).toBe("Draft");
  });
});
