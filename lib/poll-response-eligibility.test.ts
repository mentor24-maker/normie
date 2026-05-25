import { describe, expect, it } from "vitest";
import {
  buildAnsweredPollIdSet,
  filterResponsesToEligiblePolls
} from "@/lib/poll-response-eligibility";

describe("poll response eligibility", () => {
  const eligible = new Set(["live-a", "live-b"]);

  it("ignores responses for deleted or ineligible polls when building answered set", () => {
    const responses = [
      { poll_id: "deleted-old" },
      { poll_id: "live-a" },
      { poll_id: "unpublished" }
    ];

    expect(buildAnsweredPollIdSet(responses, eligible)).toEqual(new Set(["live-a"]));
  });

  it("filters response rows used for previous-results resolution", () => {
    const responses = [
      { poll_id: "deleted-old", created_at: "2026-01-01" },
      { poll_id: "live-b", created_at: "2026-01-02" }
    ];

    expect(filterResponsesToEligiblePolls(responses, eligible)).toEqual([
      { poll_id: "live-b", created_at: "2026-01-02" }
    ]);
  });
});
