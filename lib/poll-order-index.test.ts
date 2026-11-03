import { describe, expect, it } from "vitest";
import { isPollOrderIndexUniqueViolation } from "@/lib/poll-order-index";

describe("isPollOrderIndexUniqueViolation", () => {
  it("detects polls order_index unique violations", () => {
    expect(
      isPollOrderIndexUniqueViolation(
        'duplicate key value violates unique constraint "polls_order_index_key"'
      )
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isPollOrderIndexUniqueViolation("duplicate key value violates unique constraint \"other\"")).toBe(
      false
    );
  });
});
