export type PollResponseRef = {
  poll_id: string;
};

/** Responses that count toward progress for the current eligible poll set. */
export function filterResponsesToEligiblePolls<T extends PollResponseRef>(
  responses: T[],
  eligiblePollIds: ReadonlySet<string>
): T[] {
  return responses.filter((response) => eligiblePollIds.has(response.poll_id));
}

export function buildAnsweredPollIdSet(
  responses: PollResponseRef[],
  eligiblePollIds: ReadonlySet<string>
): Set<string> {
  const answered = new Set<string>();

  for (const response of responses) {
    if (eligiblePollIds.has(response.poll_id)) {
      answered.add(response.poll_id);
    }
  }

  return answered;
}
