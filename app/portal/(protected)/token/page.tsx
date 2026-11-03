import { cookies } from "next/headers";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { getPlayerCryptoWallets } from "@/lib/player-crypto-wallets";
import { PlayerTokenWalletsPanel } from "@/components/player-token-wallets-panel";

export default async function PlayerTokenPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (!player) {
    return null;
  }

  const wallets = await getPlayerCryptoWallets(player);

  if (!wallets) {
    return (
      <section className="panel player-panel">
        <div className="panel-label">Token</div>
        <h2>Token Unavailable</h2>
        <p className="panel-copy">
          Registering wallets is not available yet. Apply migration 051_player_crypto_wallets.sql and refresh
          this page.
        </p>
      </section>
    );
  }

  return <PlayerTokenWalletsPanel initialWallets={wallets} />;
}
