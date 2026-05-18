import { getBlogPostPath } from "@/lib/blog";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";

export type DeepDiveSource = {
  question: string;
  totalResponses: number;
  options: Array<{ label: string; votes: number; percentage: number }>;
};

export type DeepDivePollRef = {
  id: string;
  question: string;
  category: string | null;
};

export type DeepDiveBlogCard = {
  title: string;
  href: string;
  featuredImageUrl: string;
};

/** What the Previous Results deep-dive overlay shows (blog → youtube → related, max 6 questions). */
export type PollDeepDiveContent =
  | { kind: "blog"; title: string; href: string; featuredImageUrl: string }
  | { kind: "youtube"; embedUrl: string }
  | { kind: "related"; polls: DeepDivePollRef[] }
  | { kind: "empty" };

export const DEEP_DIVE_RELATED_LIMIT = 6;

/** Blue pod-style pill label for the deep dive overlay header (by content kind). */
export function getPollDeepDiveOverlayPillLabel(content: PollDeepDiveContent): string {
  switch (content.kind) {
    case "related":
      return "Related Polls";
    case "blog":
      return "From the Blog";
    case "youtube":
      return "Video";
    case "empty":
      return "Details";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeDeepDiveRelatedPollIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();

  for (const item of value) {
    const id = String(item ?? "").trim();
    if (UUID_PATTERN.test(id) && id !== "") {
      unique.add(id);
    }
  }

  return [...unique];
}

export function parseYoutubeEmbedUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}`;
      }

      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function topOptions(source: DeepDiveSource) {
  return [...source.options].sort((a, b) => b.percentage - a.percentage);
}

export function buildPlaceholderDeepDiveHtml(source: DeepDiveSource): string {
  const ranked = topOptions(source);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const question = escapeHtml(source.question.trim() || "this question");
  const total = source.totalResponses;
  const leaderLabel = leader ? escapeHtml(leader.label) : "the leading answer";
  const leaderPct = leader?.percentage ?? 0;
  const runnerLabel = runnerUp ? escapeHtml(runnerUp.label) : "the next most common pick";
  const runnerPct = runnerUp?.percentage ?? 0;
  const spread =
    ranked.length >= 2 ? leaderPct - (ranked[ranked.length - 1]?.percentage ?? 0) : leaderPct;

  const html = `
<h2>Overview</h2>
<p>
  Normie voters just weighed in on <strong>${question}</strong>.
  With <strong>${total}</strong> response${total === 1 ? "" : "s"} in so far, the community snapshot is taking shape.
  Replace this overview in Poll Manager when you are ready to publish editorial analysis.
</p>
<p>
  <strong>${leaderLabel}</strong> is leading at <strong>${leaderPct}%</strong>,
  while <strong>${runnerLabel}</strong> trails at <strong>${runnerPct}%</strong>.
  ${spread >= 25 ? "The gap suggests a fairly decisive preference rather than a toss-up." : "The field is still relatively tight, which usually means the next wave of answers could shift the story."}
</p>
<p>
  When a poll splits like this, it often signals more than a single preference.
  People may be using the prompt to express identity, tradeoffs, or the social signal they want to send.
</p>
`.trim();

  return sanitizeRichTextHtml(html);
}

export function resolvePollDeepDiveOverviewHtml(
  storedHtml: string | null | undefined,
  source: DeepDiveSource
): string {
  const trimmed = (storedHtml ?? "").trim();
  if (trimmed) {
    return sanitizeRichTextHtml(trimmed);
  }

  return buildPlaceholderDeepDiveHtml(source);
}

export function mergeDeepDiveRelatedPolls(
  manualOrdered: DeepDivePollRef[],
  categoryPolls: DeepDivePollRef[],
  subjectPollId: string,
  additionalExcludePollIds: string[] = [],
  limit = DEEP_DIVE_RELATED_LIMIT
): DeepDivePollRef[] {
  const block = new Set<string>([subjectPollId, ...additionalExcludePollIds]);
  const seen = new Set<string>();
  const out: DeepDivePollRef[] = [];

  for (const poll of manualOrdered) {
    if (block.has(poll.id) || seen.has(poll.id)) {
      continue;
    }
    seen.add(poll.id);
    out.push(poll);
    if (out.length >= limit) {
      return out;
    }
  }

  for (const poll of categoryPolls) {
    if (block.has(poll.id) || seen.has(poll.id)) {
      continue;
    }
    seen.add(poll.id);
    out.push(poll);
    if (out.length >= limit) {
      return out;
    }
  }

  return out;
}

export function buildPollDeepDiveContent(input: {
  youtubeUrl: string | null | undefined;
  blogPost: DeepDiveBlogCard | null;
  mergedRelatedPolls: DeepDivePollRef[];
}): PollDeepDiveContent {
  if (input.blogPost) {
    return {
      kind: "blog",
      title: input.blogPost.title,
      href: input.blogPost.href,
      featuredImageUrl: input.blogPost.featuredImageUrl
    };
  }

  const embedUrl = parseYoutubeEmbedUrl(input.youtubeUrl);
  if (embedUrl) {
    return { kind: "youtube", embedUrl };
  }

  if (input.mergedRelatedPolls.length > 0) {
    return { kind: "related", polls: input.mergedRelatedPolls };
  }

  return { kind: "empty" };
}

export function buildDeepDiveBlogCard(post: {
  id: string;
  title: string;
  slug: string;
  featuredImageUrl?: string | null;
  primaryTopic?: { slug: string } | null;
}): DeepDiveBlogCard {
  return {
    title: post.title,
    href: getBlogPostPath({ slug: post.slug, primaryTopic: post.primaryTopic ?? null }),
    featuredImageUrl: normalizeBuilderAssetUrl(post.featuredImageUrl ?? "")
  };
}

/** @deprecated Deep-dive overlay no longer uses HTML overview; kept for callers/tests. */
export function resolvePollDeepDiveHtml(
  storedHtml: string | null | undefined,
  source: DeepDiveSource
): string {
  return resolvePollDeepDiveOverviewHtml(storedHtml, source);
}
