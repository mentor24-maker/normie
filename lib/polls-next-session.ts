/**
 * Index of the poll to show as "current" for this session.
 * Uses the furthest answered poll in list order so deep-linked (`startPoll`) answers
 * advance to the next poll instead of snapping back to the first unanswered slot.
 */
export function resolveCurrentPollIndexFromSession(
  orderedPolls: Array<{ id: string }>,
  answeredPollIds: Set<string>
): number {
  if (orderedPolls.length === 0) {
    return -1;
  }

  const lastAnsweredIndex = orderedPolls.reduce(
    (maxIdx, poll, idx) => (answeredPollIds.has(poll.id) ? Math.max(maxIdx, idx) : maxIdx),
    -1
  );

  for (let i = lastAnsweredIndex + 1; i < orderedPolls.length; i++) {
    const poll = orderedPolls[i];
    if (poll && !answeredPollIds.has(poll.id)) {
      return i;
    }
  }

  return -1;
}
