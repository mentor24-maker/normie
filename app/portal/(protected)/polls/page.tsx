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
      <h2>Polls you took and your answers</h2>
      {snapshot.answers.length ? (
        <PlayerPollsAnswersTable answers={snapshot.answers} />
      ) : (
        <p className="panel-copy">You have not answered any polls while signed in yet.</p>
      )}
    </section>
  );
}
