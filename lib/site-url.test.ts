import { describe, expect, it } from "vitest";
import { getAdminAuthCallbackUrl } from "@/lib/site-url";

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
});
