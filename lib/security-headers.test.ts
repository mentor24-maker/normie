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
    expect(policy).toContain("https://dexscreener.com");
    expect(policy).toContain("https://www.geckoterminal.com");
  });

  it("allows Google Analytics in script-src and connect-src", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("https://www.googletagmanager.com");
    expect(policy).toContain("https://www.google-analytics.com");
  });
});
