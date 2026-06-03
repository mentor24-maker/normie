export type PollCategorySeed = {
  name: string;
  slug: string;
};

/** Display names for seeded poll categories (Polls Manager filter + imports). */
export const POLL_MANAGER_CATEGORY_NAMES = [
  "Identity & Psychology",
  "Money & Success",
  "Dark / Truth",
  "Social & Relationships",
  "Life Tradeoffs",
  "Future / Power",
  "Self-Perception",
  "Behavior & Habits",
  "Modern Life / Digital",
  "Absurd but Revealing"
] as const;

/** Canonical poll categories (matches admin + public category navigation). */
export const POLL_CATEGORY_SEEDS: PollCategorySeed[] = [
  { name: "Identity & Psychology", slug: "identity-psychology" },
  { name: "Money & Success", slug: "money-success" },
  { name: "Dark / Truth", slug: "dark-truth" },
  { name: "Social & Relationships", slug: "social-relationships" },
  { name: "Life Tradeoffs", slug: "life-tradeoffs" },
  { name: "Future / Power", slug: "future-power" },
  { name: "Self-Perception", slug: "self-perception" },
  { name: "Behavior & Habits", slug: "behavior-habits" },
  { name: "Modern Life / Digital", slug: "modern-life-digital" },
  { name: "Absurd but Revealing", slug: "absurd-but-revealing" }
];

const POLL_CATEGORY_ALIASES: Record<string, string> = {
  "future-and-past": "Future / Power",
  random: "Random"
};

export function slugifyPollCategory(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePollCategoryKey(value: string) {
  return slugifyPollCategory(value);
}

/** Escape a category label for case-insensitive exact `ilike` filters in Postgres. */
export function escapePollCategoryIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Canonical label for `polls.category` on write (seed name when recognized, else trimmed input). */
export function normalizePollCategoryForStorage(value: unknown): string | null {
  const resolved = resolvePollCategoryName(String(value ?? ""));

  if (!resolved) {
    return null;
  }

  return resolved.slice(0, 255);
}

/** Case-insensitive equality for poll category labels (URL params, DB rows, preferences). */
export function pollCategoriesEqual(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();

  if (!a || !b) {
    return false;
  }

  return a.toLowerCase() === b.toLowerCase();
}

/** True when a poll row's category matches any allowed label (case-insensitive). */
export function pollCategoryMatchesAny(
  pollCategory: string | null | undefined,
  allowedCategories: readonly string[]
): boolean {
  const poll = String(pollCategory ?? "").trim();

  if (!poll) {
    return false;
  }

  const pollLower = poll.toLowerCase();

  return allowedCategories.some((allowed) => allowed.trim().toLowerCase() === pollLower);
}

export function resolvePollCategoryName(param: string | null | undefined): string | null {
  const raw = param?.trim();
  if (!raw) {
    return null;
  }

  const normalized = normalizePollCategoryKey(raw);

  const aliasName = POLL_CATEGORY_ALIASES[normalized];
  if (aliasName) {
    return aliasName;
  }

  for (const category of POLL_CATEGORY_SEEDS) {
    if (category.slug === normalized || normalizePollCategoryKey(category.name) === normalized) {
      return category.name;
    }

    if (category.name.toLowerCase() === raw.toLowerCase()) {
      return category.name;
    }
  }

  return raw;
}

export function buildPollsNextRequestUrl(
  categoryParam: string | null | undefined,
  startPollId?: string | null
) {
  const params = new URLSearchParams();
  const categoryRaw = categoryParam?.trim();
  if (categoryRaw) {
    params.set("category", categoryRaw);
  }
  const startRaw = startPollId?.trim();
  if (startRaw) {
    params.set("startPoll", startRaw);
  }
  const qs = params.toString();
  return qs ? `/api/polls/next?${qs}` : "/api/polls/next";
}

/** Home page URL filtered to a poll category (see `PollExperience` `category` query param). */
export function buildPublicPollCategoryPath(category: Pick<PollCategorySeed, "slug">): string {
  const params = new URLSearchParams();
  params.set("category", category.slug);
  return `/?${params.toString()}`;
}

/** Home page URL that opens a specific published poll as the current question (`startPoll` only). */
export function buildPublicPollViewPath(poll: { id: string }): string {
  const params = new URLSearchParams();
  params.set("startPoll", poll.id);
  return `/?${params.toString()}`;
}

export function stripStartPollFromBrowserUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has("startPoll")) {
    return;
  }

  url.searchParams.delete("startPoll");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

/**
 * Polls Manager category filter order: seeded categories first, then any distinct names
 * found on polls (imports, personality systems, one-offs).
 */
export function buildPollCategoryCatalog(extraCategoryNames: readonly string[] = []): PollCategorySeed[] {
  const seen = new Set<string>();
  const ordered: PollCategorySeed[] = [];

  function addName(name: string) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    const meta = getPollCategoryMeta(trimmed);
    if (meta) {
      ordered.push(meta);
    }
  }

  for (const seed of POLL_CATEGORY_SEEDS) {
    addName(seed.name);
  }

  for (const extra of extraCategoryNames) {
    addName(extra);
  }

  return ordered;
}

export function getPollCategoryMeta(param: string | null | undefined): PollCategorySeed | null {
  const name = resolvePollCategoryName(param);
  if (!name) {
    return null;
  }

  const seeded = POLL_CATEGORY_SEEDS.find((category) => pollCategoriesEqual(category.name, name));
  if (seeded) {
    return seeded;
  }

  return {
    name,
    slug: slugifyPollCategory(name)
  };
}
