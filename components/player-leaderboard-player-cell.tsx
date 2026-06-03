import Link from "next/link";
import { PlayerLeaderboardName } from "@/components/player-leaderboard-name";
import type { LeaderboardEntry } from "@/lib/player-portal";
import { getPublicPlayerProfilePath } from "@/lib/public-player-profile-path";

export function PlayerLeaderboardPlayerCell({
  entry,
  nameClassName
}: {
  entry: Pick<LeaderboardEntry, "displayName" | "handle" | "shareProfile" | "avatarUrl">;
  nameClassName?: string;
}) {
  const avatarUrl = entry.avatarUrl.trim();
  const profilePath =
    entry.shareProfile && entry.handle.trim() ? getPublicPlayerProfilePath(entry.handle) : null;
  const avatarImage = avatarUrl ? (
    <img alt="" className="player-leaderboard-avatar" height={30} src={avatarUrl} width={30} />
  ) : null;

  return (
    <div className="player-leaderboard-player-cell">
      <span className="player-leaderboard-avatar-slot">
        {profilePath && avatarImage ? (
          <Link
            aria-label={`View ${entry.displayName} profile`}
            className="player-leaderboard-avatar-link"
            href={profilePath}
            rel="noopener noreferrer"
            target="_blank"
          >
            {avatarImage}
          </Link>
        ) : (
          avatarImage
        )}
      </span>
      <span className="player-leaderboard-name-slot">
        <PlayerLeaderboardName className={nameClassName} entry={entry} />
      </span>
    </div>
  );
}
