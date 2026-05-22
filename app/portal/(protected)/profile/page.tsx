import { cookies } from "next/headers";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerProfileDetails } from "@/lib/player-profile";
import { PlayerProfileForm } from "@/components/player-profile-form";

export default async function PlayerProfilePage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return null;
  }

  const profile = await getPlayerProfileDetails(player);

  if (!profile) {
    return (
      <section className="panel player-panel">
        <div className="panel-label">Profile</div>
        <h2>Profile unavailable</h2>
        <p className="panel-copy">
          Player profile fields are not available yet. Apply the latest Supabase migration and refresh this page.
        </p>
      </section>
    );
  }

  return <PlayerProfileForm initialProfile={profile} />;
}
