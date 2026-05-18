export type PollCategorySeed = {
  name: string;
  slug: string;
};

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

/** Path + query to open the site with a specific published poll as the current question (see `/api/polls/next?startPoll=`). */
export function buildPublicPollViewPath(poll: { id: string; category: string | null }): string {
  const params = new URLSearchParams();
  params.set("startPoll", poll.id);
  const cat = poll.category?.trim();
  if (cat) {
    const seeded = POLL_CATEGORY_SEEDS.find((c) => c.name === cat);
    params.set("category", seeded?.slug ?? slugifyPollCategory(cat));
  }
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

export function getPollCategoryMeta(param: string | null | undefined): PollCategorySeed | null {
  const name = resolvePollCategoryName(param);
  if (!name) {
    return null;
  }

  const seeded = POLL_CATEGORY_SEEDS.find((category) => category.name === name);
  if (seeded) {
    return seeded;
  }

  return {
    name,
    slug: slugifyPollCategory(name)
  };
}
