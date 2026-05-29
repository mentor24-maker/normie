"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  markPollSessionClaimedForUser,
  readPollSessionBackup,
  wasPollSessionClaimedForUser
} from "@/lib/poll-session-backup-client";

type PlayerLinkPreviousPollsProps = {
  playerId: string;
  hasAnswers: boolean;
};

type ClaimPollSessionResponse = {
  ok?: boolean;
  error?: string;
  claimed?: number;
  skippedDuplicate?: number;
  removedAnonymousDuplicate?: number;
};

function formatClaimMessage(data: ClaimPollSessionResponse) {
  const claimed = data.claimed ?? 0;

  if (claimed > 0) {
    return `Linked ${claimed} poll${claimed === 1 ? "" : "s"} to your account.`;
  }

  return "No anonymous polls were found for this browser session. They may already be on your account or were taken on another device.";
}

export function PlayerLinkPreviousPolls({ playerId, hasAnswers }: PlayerLinkPreviousPollsProps) {
  const router = useRouter();
  const [backupSessionId, setBackupSessionId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const sessionId = readPollSessionBackup();

    if (!sessionId || wasPollSessionClaimedForUser(playerId, sessionId)) {
      setBackupSessionId(null);
      return;
    }

    setBackupSessionId(sessionId);
  }, [playerId]);

  async function handleLinkPreviousPolls() {
    if (!backupSessionId || isLinking) {
      return;
    }

    setIsLinking(true);
    setNotice(null);

    try {
      const response = await fetch("/api/player/claim-poll-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: backupSessionId })
      });
      const data = (await response.json()) as ClaimPollSessionResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Previous polls could not be linked.");
      }

      markPollSessionClaimedForUser(playerId, backupSessionId);
      setBackupSessionId(null);
      setNotice({ type: "success", message: formatClaimMessage(data) });
      router.refresh();
    } catch (linkError) {
      setNotice({
        type: "error",
        message: linkError instanceof Error ? linkError.message : "Previous polls could not be linked."
      });
    } finally {
      setIsLinking(false);
    }
  }

  const showRecoveryPanel = !hasAnswers || Boolean(backupSessionId) || Boolean(notice);

  if (!showRecoveryPanel) {
    return null;
  }

  return (
    <div className="player-link-previous-polls">
      <p className="panel-copy">
        {hasAnswers
          ? "Missing polls from before you signed in?"
          : "You have not answered any polls on this account yet."}{" "}
        Polls taken while signed out on this browser can be linked to your player account.
      </p>
      {backupSessionId ? (
        <button
          className="secondary-button player-link-previous-polls-button"
          disabled={isLinking}
          onClick={() => void handleLinkPreviousPolls()}
          type="button"
        >
          {isLinking ? "Linking..." : "Link Previous Polls"}
        </button>
      ) : (
        <p className="panel-copy player-link-previous-polls-hint">
          Play at least one poll on this device while signed out, then return here to link them. New
          sign-ins on the same browser link automatically.
        </p>
      )}
      {notice ? (
        <p
          className={
            notice.type === "success" ? "admin-notice player-link-previous-polls-notice" : "error player-link-previous-polls-notice"
          }
          role="status"
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
