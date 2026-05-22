import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  PublicPlayerProfilePrivateView,
  PublicPlayerProfileView,
  getPublicProfileTitle
} from "@/components/public-player-profile-view";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPublicPlayerProfileByHandle } from "@/lib/public-player-profile";
import { SiteShell } from "@/src/site/layout/site-shell";
import { SiteStandardChrome } from "@/src/site/layout/site-standard-chrome";

type PlayerPublicProfilePageProps = {
  params: Promise<{
    handle: string;
  }>;
};

export async function generateMetadata({ params }: PlayerPublicProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const cookieStore = await cookies();
  const viewer = await getAuthorizedPlayerFromCookieStore(cookieStore);
  const lookup = await getPublicPlayerProfileByHandle(handle, viewer?.authUser.id);

  if (lookup.status !== "ok") {
    return {
      title: "Player Profile | Normie"
    };
  }

  return {
    title: `${getPublicProfileTitle(lookup.profile)} | Normie`,
    description: lookup.profile.bio || `Public Normie player profile for @${lookup.profile.handle}.`
  };
}

export default async function PlayerPublicProfilePage({ params }: PlayerPublicProfilePageProps) {
  const { handle } = await params;
  const cookieStore = await cookies();
  const viewer = await getAuthorizedPlayerFromCookieStore(cookieStore);
  const lookup = await getPublicPlayerProfileByHandle(handle, viewer?.authUser.id);

  if (lookup.status === "not_found") {
    notFound();
  }

  return (
    <SiteShell className="page-shell player-public-page">
      <SiteStandardChrome />
      <div className="player-public-profile-content">
        <nav className="player-public-profile-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Players</span>
        </nav>

        {lookup.status === "private" ? (
          <PublicPlayerProfilePrivateView />
        ) : (
          <PublicPlayerProfileView profile={lookup.profile} />
        )}
      </div>
    </SiteShell>
  );
}
