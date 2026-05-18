"use client";

import { useEffect, useMemo, useState } from "react";

export type PollRelatedPickerItem = {
  id: string;
  question: string;
  category: string | null;
  order_index: number;
};

type PollRelatedPickerModalProps = {
  polls: PollRelatedPickerItem[];
  currentPollId: string;
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
};

export function PollRelatedPickerModal({
  polls,
  currentPollId,
  selectedIds,
  onApply,
  onClose
}: PollRelatedPickerModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setDraftIds(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filteredPolls = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    return polls
      .filter((poll) => poll.id !== currentPollId)
      .filter((poll) => {
        if (!needle) {
          return true;
        }

        const haystack = `${poll.question} ${poll.category ?? ""} ${poll.order_index}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.order_index - b.order_index);
  }, [currentPollId, filter, polls]);

  function togglePoll(pollId: string) {
    setDraftIds((current) =>
      current.includes(pollId) ? current.filter((id) => id !== pollId) : [...current, pollId]
    );
  }

  return (
    <div className="poll-related-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="poll-related-picker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="poll-related-picker-title"
      >
        <div className="poll-related-picker-header">
          <div>
            <div className="panel-label">Related Polls</div>
            <h3 id="poll-related-picker-title">Select polls to relate</h3>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancel
          </button>
        </div>

        <label className="field poll-related-picker-filter">
          <span>Search</span>
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by question or category"
          />
        </label>

        <div className="poll-related-picker-list" role="listbox" aria-multiselectable="true">
          {filteredPolls.map((poll) => (
            <label className="poll-related-picker-row" key={poll.id}>
              <input
                type="checkbox"
                checked={draftIds.includes(poll.id)}
                onChange={() => togglePoll(poll.id)}
              />
              <span className="poll-related-picker-row-copy">
                <strong>#{poll.order_index}</strong> {poll.question}
                {poll.category ? <small>{poll.category}</small> : null}
              </span>
            </label>
          ))}
          {filteredPolls.length === 0 ? (
            <p className="poll-related-picker-empty">No polls match this filter.</p>
          ) : null}
        </div>

        <div className="poll-related-picker-footer">
          <span className="poll-related-picker-count">
            {draftIds.length} poll{draftIds.length === 1 ? "" : "s"} selected
          </span>
          <button
            className="submit-button admin-blog-add-button"
            onClick={() => {
              onApply(draftIds);
              onClose();
            }}
            type="button"
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
}
