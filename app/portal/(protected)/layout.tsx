import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerLogoutButton } from "@/components/player-logout-button";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import logoSquare from "@/images/logo_normie_3_1000x1000.png";

export default async function ProtectedPortalLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    redirect("/portal");
  }

  const displayName = player.profile.full_name || player.profile.handle || "Normie Player";

  return (
    <main className="admin-page player-page">
      <section className="admin-shell admin-shell-wide player-shell">
        <div className="admin-header">
          <div className="admin-brand">
            <Image src={logoSquare} alt="Normie logo" className="admin-brand-logo" priority />
            <div className="admin-brand-copy">
              <div className="page-eyebrow">Player Portal</div>
              <h1 className="admin-title">Welcome, {displayName}</h1>
              <p className="page-copy admin-copy">
                Review your poll history, token progress, and leaderboard position.
              </p>
            </div>
          </div>
        </div>
        <nav className="admin-nav admin-nav-bar" aria-label="Player navigation">
          <Link className="admin-nav-link" href="/portal/dashboard">Dashboard</Link>
          <Link className="admin-nav-link" href="/portal/polls">My Polls</Link>
          <Link className="admin-nav-link" href="/portal/tokens">Tokens</Link>
          <Link className="admin-nav-link" href="/portal/leaderboard">Leaderboard</Link>
          <Link className="admin-nav-link" href="/">Play</Link>
          <PlayerLogoutButton />
        </nav>
        {children}
      </section>
    </main>
  );
}
