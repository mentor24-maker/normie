import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { PlayerPortalPollSection } from "@/components/player-portal-poll-section";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPortalSnapshot } from "@/lib/player-portal";

export default async function PlayerDashboardPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) return null;

  const snapshot = await getPlayerPortalSnapshot(player);
  const recentAnswers = snapshot.answers.slice(0, 5);

  return (
    <div className="player-stack">
      <Suspense fallback={<div className="notice player-portal-polls-loading">Loading polls...</div>}>
        <PlayerPortalPollSection
          stats={{
            pollsTaken: snapshot.pollsTaken,
            tokensEarned: snapshot.tokensEarned,
            playerRank: snapshot.playerRank
          }}
        />
      </Suspense>
      <section className="player-dashboard-grid">
        <article className="panel player-panel">
          <div className="player-panel-header">
            <div><div className="panel-label">Recent Answers</div><h2>Your Latest Poll Choices</h2></div>
            <Link className="site-link-pill" href="/portal/polls">View All</Link>
          </div>
          {recentAnswers.length ? (
            <div className="player-answer-list">
              {recentAnswers.map((answer) => (
                <div className="player-answer-row" key={answer.id}>
                  <div><strong>{answer.question}</strong><span>{answer.category}</span></div>
                  <div className="player-answer-choice">{answer.answer}</div>
                </div>
              ))}
            </div>
          ) : <p className="panel-copy">Answer a public poll and your player history will start filling in here.</p>}
        </article>
        <article className="panel player-panel">
          <div className="player-panel-header">
            <div><div className="panel-label">Leaderboard</div><h2>Top Point Earners</h2></div>
            <Link className="site-link-pill" href="/portal/leaderboard">Open</Link>
          </div>
          {snapshot.leaderboard.length ? (
            <div className="player-leaderboard-list">
              {snapshot.leaderboard.slice(0, 5).map((entry) => (
                <div className="player-leaderboard-row" key={entry.playerId}>
                  <span>#{entry.rank}</span><strong>{entry.displayName}</strong><span>{entry.tokensEarned} points</span>
                </div>
              ))}
            </div>
          ) : <p className="panel-copy">The leaderboard will appear as registered players answer polls.</p>}
        </article>
      </section>
    </div>
  );
}
