import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security-headers";

describe("buildContentSecurityPolicy", () => {
  it("allows trusted video and social embed origins in frame-src", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("frame-src");
    expect(policy).toContain("https://www.youtube.com");
    expect(policy).toContain("https://www.youtube-nocookie.com");
    expect(policy).toContain("https://player.vimeo.com");
    expect(policy).toContain("https://platform.twitter.com");
  });
});
