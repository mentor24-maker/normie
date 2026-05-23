import { cookies } from "next/headers";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerPreferences } from "@/lib/player-preferences";
import { PlayerPreferencesForm } from "@/components/player-preferences-form";

export default async function PlayerPreferencesPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return null;
  }

  const preferences = await getPlayerPreferences(player);

  if (!preferences) {
    return (
      <section className="panel player-panel">
        <div className="panel-label">Preferences</div>
        <h2>Preferences unavailable</h2>
        <p className="panel-copy">
          Player preference fields are not available yet. Apply migration 014_player_preferences.sql
          and refresh this page.
        </p>
      </section>
    );
  }

  return <PlayerPreferencesForm initialPreferences={preferences} />;
}
