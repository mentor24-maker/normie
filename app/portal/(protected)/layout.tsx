import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerPortalNav } from "@/components/player-portal-nav";
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
  const handle = player.profile.handle?.trim();

  return (
    <main className="player-portal-page">
      <div className="player-portal-frame">
        <header className="player-portal-top">
          <div className="player-portal-brand">
            <Image
              src={logoSquare}
              alt="Normie logo"
              className="player-portal-logo"
              priority
            />
            <div className="player-portal-brand-copy">
              <p className="player-portal-eyebrow">Player Portal</p>
              <h1 className="player-portal-title">Hey, {displayName}</h1>
              <p className="player-portal-tagline">
                Track your poll picks, points, and where you rank among other Normies.
                {handle ? (
                  <>
                    {" "}
                    <span className="player-portal-handle">@{handle}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <Link className="submit-button player-portal-play-cta" href="/portal/dashboard?playPolls=1">
            Play Polls
          </Link>
        </header>

        <Suspense fallback={<nav aria-label="Player navigation" className="player-portal-nav player-portal-nav-fallback" />}>
          <PlayerPortalNav />
        </Suspense>

        <div className="player-portal-main">{children}</div>
      </div>
    </main>
  );
}
