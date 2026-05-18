import { describe, expect, it } from "vitest";
import {
  buildPlaceholderDeepDiveHtml,
  buildPollDeepDiveContent,
  getPollDeepDiveOverlayPillLabel,
  mergeDeepDiveRelatedPolls,
  normalizeDeepDiveRelatedPollIds,
  parseYoutubeEmbedUrl,
  resolvePollDeepDiveOverviewHtml
} from "@/lib/poll-deep-dive";

describe("poll deep dive", () => {
  const source = {
    question: "Would you rather know the truth late or never?",
    totalResponses: 1284,
    options: [
      { label: "Know it late", votes: 720, percentage: 56 },
      { label: "Never know", votes: 564, percentage: 44 }
    ]
  };

  it("builds placeholder html with question and leaders", () => {
    const html = buildPlaceholderDeepDiveHtml(source);
    expect(html).toContain("Overview");
    expect(html).toContain("Would you rather know the truth late or never?");
    expect(html).toContain("Know it late");
    expect(html).toContain("56%");
  });

  it("prefers stored html when provided", () => {
    const custom = "<p>Custom editorial overview.</p>";
    const html = resolvePollDeepDiveOverviewHtml(custom, source);
    expect(html).toContain("Custom editorial overview");
    expect(html).not.toContain("Replace this overview");
  });

  it("strips unsafe markup from stored html", () => {
    const html = resolvePollDeepDiveOverviewHtml('<p>Safe</p><script>alert(1)</script>', source);
    expect(html).toContain("Safe");
    expect(html).not.toContain("script");
  });

  it("parses youtube watch urls", () => {
    expect(parseYoutubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("resolves deep dive overlay pill labels", () => {
    expect(getPollDeepDiveOverlayPillLabel({ kind: "related", polls: [] })).toBe("Related Polls");
    expect(
      getPollDeepDiveOverlayPillLabel({
        kind: "blog",
        title: "T",
        href: "/blog/t/x",
        featuredImageUrl: ""
      })
    ).toBe("From the Blog");
    expect(getPollDeepDiveOverlayPillLabel({ kind: "youtube", embedUrl: "https://example.com" })).toBe(
      "Video"
    );
    expect(getPollDeepDiveOverlayPillLabel({ kind: "empty" })).toBe("Details");
  });

  it("normalizes related poll ids", () => {
    expect(normalizeDeepDiveRelatedPollIds(["bad", "550e8400-e29b-41d4-a716-446655440000"])).toEqual([
      "550e8400-e29b-41d4-a716-446655440000"
    ]);
  });

  it("prefers blog over youtube in deep dive content", () => {
    const content = buildPollDeepDiveContent({
      blogPost: { title: "Post", href: "/blog/t/p", featuredImageUrl: "/x.png" },
      youtubeUrl: "https://www.youtube.com/watch?v=abc123",
      mergedRelatedPolls: [{ id: "p1", question: "Q?", category: null }]
    });
    expect(content.kind).toBe("blog");
    if (content.kind === "blog") {
      expect(content.title).toBe("Post");
    }
  });

  it("uses youtube when no blog", () => {
    const content = buildPollDeepDiveContent({
      blogPost: null,
      youtubeUrl: "https://www.youtube.com/watch?v=abc123",
      mergedRelatedPolls: []
    });
    expect(content.kind).toBe("youtube");
    if (content.kind === "youtube") {
      expect(content.embedUrl).toContain("youtube.com/embed");
    }
  });

  it("uses merged related when no blog or youtube", () => {
    const merged = [
      { id: "a", question: "A", category: "Cat" },
      { id: "b", question: "B", category: "Cat" }
    ];
    const content = buildPollDeepDiveContent({
      blogPost: null,
      youtubeUrl: "",
      mergedRelatedPolls: merged
    });
    expect(content.kind).toBe("related");
    if (content.kind === "related") {
      expect(content.polls).toEqual(merged);
    }
  });

  it("merges manual related first then category up to the related limit", () => {
    const manual = [
      { id: "m1", question: "M1", category: null },
      { id: "m2", question: "M2", category: null }
    ];
    const category = [
      { id: "m1", question: "Dup", category: null },
      { id: "c1", question: "C1", category: "X" },
      { id: "c2", question: "C2", category: "X" },
      { id: "c3", question: "C3", category: "X" },
      { id: "c4", question: "C4", category: "X" },
      { id: "c5", question: "C5", category: "X" },
      { id: "c6", question: "C6", category: "X" },
      { id: "c7", question: "C7", category: "X" }
    ];
    const merged = mergeDeepDiveRelatedPolls(manual, category, "current", []);
    expect(merged.map((p) => p.id)).toEqual(["m1", "m2", "c1", "c2", "c3", "c4"]);
  });

  it("excludes additional poll ids from merged related (e.g. session current)", () => {
    const manual = [{ id: "m1", question: "M1", category: null }];
    const category = [
      { id: "next", question: "Next", category: null },
      { id: "c1", question: "C1", category: null }
    ];
    const merged = mergeDeepDiveRelatedPolls(manual, category, "sub", ["next"]);
    expect(merged.map((p) => p.id)).toEqual(["m1", "c1"]);
  });
});
