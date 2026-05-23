function randomUnansweredIndex(length: number) {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return Math.floor((randomValue / 2 ** 32) * length);
}

/** Pick one unanswered poll at random from the eligible list. */
export function pickRandomUnansweredPoll<T extends { id: string }>(
  polls: T[],
  answeredPollIds: Set<string>
): T | null {
  const unanswered = polls.filter((poll) => !answeredPollIds.has(poll.id));

  if (unanswered.length === 0) {
    return null;
  }

  const index = randomUnansweredIndex(unanswered.length);
  return unanswered[index] ?? null;
}

/** Most recently answered poll (responses newest-first), optionally skipping one id. */
export function resolveMostRecentAnsweredPoll<T extends { id: string }>(
  orderedPolls: T[],
  responses: Array<{ poll_id: string }>,
  excludePollId?: string | null
): T | null {
  const pollById = new Map(orderedPolls.map((poll) => [poll.id, poll]));

  for (const response of responses) {
    if (excludePollId && response.poll_id === excludePollId) {
      continue;
    }

    const poll = pollById.get(response.poll_id);

    if (poll) {
      return poll;
    }
  }

  return null;
}
