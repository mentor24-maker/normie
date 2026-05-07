export type PollOption = {
  id: string;
  label: string;
};

export type CurrentPoll = {
  id: string;
  question: string;
  options: PollOption[];
};

export type PreviousPollOption = {
  id: string;
  label: string;
  votes: number;
  percentage: number;
};

export type PreviousPoll = {
  id: string;
  question: string;
  totalResponses: number;
  options: PreviousPollOption[];
};

export type PollPayload = {
  done?: boolean;
  error?: string;
  currentPoll: CurrentPoll | null;
  previousPoll: PreviousPoll | null;
};
