import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerGameFloatingImageHost } from "@/components/player-game-floating-image-host";
import { PlayerGameSpeechBubbleHost } from "@/components/player-game-speech-bubble-host";
import { PlayerGameRemindersHost } from "@/components/player-game-reminders-host";
import { PlayerLogoutButton } from "@/components/player-logout-button";
import { PlayerPortalNav } from "@/components/player-portal-nav";
import { PlayerPortalPlayCta } from "@/components/player-portal-play-cta";
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
          <div className="player-portal-top-eyebrow-row">
            <p className="player-portal-eyebrow">Player Portal</p>
            <div className="player-portal-header-utility">
              <Link className="secondary-button player-portal-profile-cta" href="/portal/profile">
                Profile
              </Link>
              <PlayerLogoutButton className="player-portal-header-logout" />
            </div>
          </div>
          <div className="player-portal-top-body">
          <div className="player-portal-brand">
            <div className="player-portal-brand-main">
              <Link
                className="player-portal-logo-link"
                href="https://normie.one"
                rel="noopener noreferrer"
              >
                <Image
                  src={logoSquare}
                  alt="Normie home"
                  className="player-portal-logo"
                  priority
                />
              </Link>
              <div className="player-portal-brand-greeting">
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
          </div>
          <div className="player-portal-play-slot">
            <Suspense fallback={null}>
              <PlayerPortalPlayCta />
            </Suspense>
          </div>
          </div>
        </header>

        <Suspense fallback={<nav aria-label="Player navigation" className="player-portal-nav player-portal-nav-fallback" />}>
          <PlayerPortalNav />
        </Suspense>

        <div className="player-portal-main">
          <PlayerGameRemindersHost />
          <PlayerGameFloatingImageHost />
          <PlayerGameSpeechBubbleHost />
          {children}
        </div>
      </div>
    </main>
  );
}
