"use client";

import { useRouter } from "next/navigation";

export function PlayerLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/player/session", { method: "DELETE" });
    router.push("/portal");
    router.refresh();
  }

  return (
    <button
      className="player-portal-nav-link player-portal-nav-link-logout"
      onClick={() => void handleLogout()}
      type="button"
    >
      Logout
    </button>
  );
}
