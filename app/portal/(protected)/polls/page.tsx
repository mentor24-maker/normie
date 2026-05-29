import { cookies } from "next/headers";
import { PlayerPollsAnswersTable } from "@/components/player-polls-answers-table";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPortalSnapshot } from "@/lib/player-portal";

export default async function PlayerPollsPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);
  if (!player) return null;
  const snapshot = await getPlayerPortalSnapshot(player);

  return (
    <section className="panel player-panel">
      <div className="panel-label">My Polls</div>
      <h2>Polls You Took and Your Answers</h2>
      {snapshot.answers.length ? (
        <PlayerPollsAnswersTable answers={snapshot.answers} />
      ) : (
        <p className="panel-copy">
          You have not answered any polls on this account yet. Polls you took before signing in are
          added when you log in from the same browser.
        </p>
      )}
    </section>
  );
}
