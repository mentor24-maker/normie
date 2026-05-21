import { cookies } from "next/headers";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPortalSnapshot } from "@/lib/player-portal";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

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
        <div className="table-shell">
          <table className="polls-table player-table">
            <thead><tr><th>Question</th><th>Answer</th><th>Category</th><th>Tokens</th><th>Answered</th></tr></thead>
            <tbody>
              {snapshot.answers.map((answer) => (
                <tr key={answer.id}><td>{answer.question}</td><td>{answer.answer}</td><td>{answer.category}</td><td>{answer.tokensEarned}</td><td>{formatDate(answer.answeredAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="panel-copy">You have not answered any polls while signed in yet.</p>}
    </section>
  );
}
