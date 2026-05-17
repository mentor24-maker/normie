import { describe, expect, it } from "vitest";
import { redactValue } from "@/lib/observability/redact";

describe("redactValue", () => {
  it("redacts emails and bearer tokens in strings", () => {
    const value = redactValue("Contact user@example.com with Bearer secret-token-123");
    expect(value).toContain("[redacted-email]");
    expect(value).toContain("Bearer [redacted]");
  });

  it("redacts sensitive object keys", () => {
    const value = redactValue({
      email: "user@example.com",
      authorization: "Bearer abc",
      sessionId: "abc-123",
      category: "polls"
    }) as Record<string, unknown>;

    expect(value.email).toBe("[redacted]");
    expect(value.authorization).toBe("[redacted]");
    expect(value.sessionId).toBe("[redacted]");
    expect(value.category).toBe("polls");
  });
});
