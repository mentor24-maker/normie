import { describe, expect, it, vi } from "vitest";
import { getAdminAuthCallbackUrl, getAuthEmailSiteUrl, getPlayerAuthCallbackUrl } from "@/lib/site-url";

describe("getAdminAuthCallbackUrl", () => {
  it("uses the request host when it is an allowed production host", () => {
    const request = new Request("https://www.normie.one/api/admin/team/invite", {
      headers: {
        host: "www.normie.one",
        "x-forwarded-proto": "https"
      }
    });

    expect(getAdminAuthCallbackUrl(request)).toBe("https://www.normie.one/admin/auth/callback");
  });

  it("uses http for localhost player callbacks when no forwarded protocol is present", () => {
    const request = new Request("http://localhost:3000/api/player/register", {
      headers: {
        host: "localhost:3000"
      }
    });

    expect(getPlayerAuthCallbackUrl(request)).toBe("http://localhost:3000/portal/auth/callback");
  });
});

describe("getAuthEmailSiteUrl", () => {
  it("uses production origin when app site url is localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("AUTH_EMAIL_SITE_URL", "");

    expect(getAuthEmailSiteUrl()).toBe("https://www.normie.one");
  });

  it("honors AUTH_EMAIL_SITE_URL override", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("AUTH_EMAIL_SITE_URL", "https://normie.one");

    expect(getAuthEmailSiteUrl()).toBe("https://normie.one");
  });
});
