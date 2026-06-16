import type { PollReactionKind } from "@/lib/poll-reaction";

type PollReactionButtonsProps = {
  disabled?: boolean;
  playerReaction?: PollReactionKind | null;
  onReact: (reaction: PollReactionKind) => void | Promise<void>;
};

function PollReactionIcon({ kind }: { kind: PollReactionKind }) {
  if (kind === "like") {
    return (
      <svg aria-hidden="true" className="poll-reaction-icon" fill="none" height="22" viewBox="0 0 24 24" width="22">
        <path
          d="M7 10v10H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3Zm2.3-2.7 3.2-5.4a2 2 0 0 1 3.5 1.4V8h4.7a2 2 0 0 1 1.9 2.7l-2.4 7.2A2 2 0 0 1 18 20H9V10.3Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="poll-reaction-icon" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="M17 14V4h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3Zm-2.3 2.7-3.2 5.4a2 2 0 0 1-3.5-1.4V16H3.5a2 2 0 0 1-1.9-2.7l2.4-7.2A2 2 0 0 1 6 4h9v12.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PollReactionButtons({ disabled = false, playerReaction = null, onReact }: PollReactionButtonsProps) {
  const locked = disabled || Boolean(playerReaction);

  return (
    <div aria-label="Poll reactions" className="poll-reaction-corner-controls" role="group">
      <button
        aria-label="Dislike"
        aria-pressed={playerReaction === "dislike"}
        className={`poll-reaction-button poll-reaction-button-dislike${playerReaction === "dislike" ? " is-active" : ""}`}
        disabled={locked}
        onClick={() => void onReact("dislike")}
        type="button"
      >
        <PollReactionIcon kind="dislike" />
        <span className="poll-reaction-button-label">Dislike</span>
      </button>
      <button
        aria-label="Like"
        aria-pressed={playerReaction === "like"}
        className={`poll-reaction-button poll-reaction-button-like${playerReaction === "like" ? " is-active" : ""}`}
        disabled={locked}
        onClick={() => void onReact("like")}
        type="button"
      >
        <PollReactionIcon kind="like" />
        <span className="poll-reaction-button-label">Like</span>
      </button>
    </div>
  );
}
