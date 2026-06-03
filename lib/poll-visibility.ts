export type PollVisibilityFields = {
  is_published: boolean;
  is_hidden?: boolean | null;
};

export function isPollHidden(poll: PollVisibilityFields): boolean {
  return poll.is_hidden === true;
}

/** Visible on the public site, player portal, and anonymous poll APIs. */
export function isPollVisibleOnSite(poll: PollVisibilityFields): boolean {
  return poll.is_published && !isPollHidden(poll);
}

export function pollStatusLabel(poll: PollVisibilityFields): "Hidden" | "Published" | "Draft" {
  if (isPollHidden(poll)) {
    return "Hidden";
  }

  return poll.is_published ? "Published" : "Draft";
}
