import { cookies } from "next/headers";
import Link from "next/link";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPortalSnapshot } from "@/lib/player-portal";

export default async function PlayerTokensPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);
  if (!player) return null;
  const snapshot = await getPlayerPortalSnapshot(player);

  return (
    <section className="player-dashboard-grid">
      <article className="panel player-token-panel">
        <div className="panel-label">Tokens</div>
        <h2>Your earned token balance</h2>
        <div className="player-token-total">{snapshot.tokensEarned}</div>
        <p className="panel-copy">Tokens currently accrue from registered poll answers. This gives the portal a clean starting ledger for future rewards, streaks, and wallet features.</p>
        <Link className="submit-button player-primary-link" href="/">Answer More Polls</Link>
      </article>
      <article className="panel player-panel">
        <div className="panel-label">Earning Sources</div>
        <h2>How this total is built</h2>
        <div className="player-answer-list">
          <div className="player-answer-row">
            <div><strong>Poll answers</strong><span>{snapshot.pollsTaken} registered answer{snapshot.pollsTaken === 1 ? "" : "s"}</span></div>
            <div className="player-answer-choice">{snapshot.tokensEarned} tokens</div>
          </div>
        </div>
      </article>
    </section>
  );
}
