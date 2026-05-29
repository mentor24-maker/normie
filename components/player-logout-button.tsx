"use client";

type PlayerLogoutButtonProps = {
  className?: string;
};

export function PlayerLogoutButton({ className }: PlayerLogoutButtonProps) {
  function handleLogout() {
    window.location.assign("/portal/logout");
  }

  const buttonClassName = className
    ? `player-portal-nav-link player-portal-nav-link-logout ${className}`
    : "player-portal-nav-link player-portal-nav-link-logout";

  return (
    <button className={buttonClassName} onClick={handleLogout} type="button">
      Logout
    </button>
  );
}
