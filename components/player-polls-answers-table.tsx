"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlayerAnswer } from "@/lib/player-portal";

function formatAnsweredDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

type PlayerPollsAnswersTableProps = {
  answers: PlayerAnswer[];
};

export function PlayerPollsAnswersTable({ answers }: PlayerPollsAnswersTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(answers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleAnswerChange(responseId: string, optionId: string) {
    const row = rows.find((entry) => entry.id === responseId);
    if (!row || row.optionId === optionId) {
      return;
    }

    setSavingId(responseId);
    setNotice(null);

    try {
      const response = await fetch(`/api/player/responses/${responseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId })
      });
      const payload = (await response.json()) as { data?: { answer?: string }; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update answer.");
      }

      const answerLabel = payload.data?.answer ?? row.options.find((option) => option.id === optionId)?.label ?? row.answer;

      setRows((current) =>
        current.map((entry) =>
          entry.id === responseId ? { ...entry, optionId, answer: answerLabel } : entry
        )
      );
      setNotice({ type: "success", message: "Answer updated." });
      router.refresh();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update answer."
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      {notice ? (
        <p className={notice.type === "success" ? "admin-notice-success" : "admin-notice-error"} role="status">
          {notice.message}
        </p>
      ) : null}
      <div className="table-shell">
        <table className="polls-table player-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Answer</th>
              <th>Category</th>
              <th>Points</th>
              <th>Answered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((answer) => (
              <tr key={answer.id}>
                <td>{answer.question}</td>
                <td>
                  <label className="player-table-answer-label">
                    <select
                      className="player-table-answer-select"
                      aria-label={`Answer for ${answer.question}`}
                      value={answer.optionId}
                      disabled={savingId === answer.id || answer.options.length === 0}
                      onChange={(event) => void handleAnswerChange(answer.id, event.target.value)}
                    >
                      {answer.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </td>
                <td>{answer.category}</td>
                <td>{answer.tokensEarned}</td>
                <td>{formatAnsweredDate(answer.answeredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
