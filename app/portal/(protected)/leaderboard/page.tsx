import { cookies } from "next/headers";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPortalSnapshot } from "@/lib/player-portal";

export default async function PlayerLeaderboardPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);
  if (!player) return null;
  const snapshot = await getPlayerPortalSnapshot(player);

  return (
    <section className="panel player-panel">
      <div className="panel-label">Leaderboard</div>
      <h2>Registered player standings</h2>
      {snapshot.leaderboard.length ? (
        <div className="table-shell">
          <table className="polls-table player-table">
            <thead><tr><th>Rank</th><th>Player</th><th>Handle</th><th>Polls</th><th>Tokens</th></tr></thead>
            <tbody>
              {snapshot.leaderboard.map((entry) => (
                <tr className={entry.playerId === snapshot.player.id ? "player-table-highlight" : undefined} key={entry.playerId}>
                  <td>#{entry.rank}</td><td>{entry.displayName}</td><td>@{entry.handle}</td><td>{entry.answersCount}</td><td>{entry.tokensEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="panel-copy">No registered player answers yet. The first signed-in votes will start the race.</p>}
    </section>
  );
}
