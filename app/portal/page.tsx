import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlayerLoginScreen } from "@/components/player-login-screen";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";

export default async function PlayerPortalLoginPage() {
  const cookieStore = await cookies();
  const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

  if (player) {
    redirect("/portal/dashboard");
  }

  return <PlayerLoginScreen />;
}
