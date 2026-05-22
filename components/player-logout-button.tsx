"use client";

import { useRouter } from "next/navigation";

type PlayerLogoutButtonProps = {
  className?: string;
};

export function PlayerLogoutButton({ className }: PlayerLogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/player/session", { method: "DELETE" });
    router.push("/portal");
    router.refresh();
  }

  const buttonClassName = className
    ? `player-portal-nav-link player-portal-nav-link-logout ${className}`
    : "player-portal-nav-link player-portal-nav-link-logout";

  return (
    <button className={buttonClassName} onClick={() => void handleLogout()} type="button">
      Logout
    </button>
  );
}
