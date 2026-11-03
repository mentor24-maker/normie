import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/player-portal";
import { getPublicPlayerProfilePath } from "@/lib/public-player-profile-path";

type PlayerLeaderboardNameProps = {
  entry: Pick<LeaderboardEntry, "displayName" | "handle" | "shareProfile">;
  className?: string;
};

export function PlayerLeaderboardName({ entry, className }: PlayerLeaderboardNameProps) {
  if (!entry.shareProfile || !entry.handle.trim()) {
    return <span className={className}>{entry.displayName}</span>;
  }

  return (
    <Link
      className={className ? `player-leaderboard-name-link ${className}` : "player-leaderboard-name-link"}
      href={getPublicPlayerProfilePath(entry.handle)}
      rel="noopener noreferrer"
      target="_blank"
    >
      {entry.displayName}
    </Link>
  );
}
