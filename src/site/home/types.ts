export type PollOption = {
  id: string;
  label: string;
};

export type CurrentPoll = {
  id: string;
  question: string;
  imageUrl?: string;
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

export type PollCategoryFilter = {
  slug: string;
  name: string;
};

export type PollPayload = {
  done?: boolean;
  error?: string;
  activeCategory?: PollCategoryFilter | null;
  currentPoll: CurrentPoll | null;
  previousPoll: PreviousPoll | null;
};
