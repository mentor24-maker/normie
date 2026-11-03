"use client";

import {
  getPlayerPortalAuthSettings,
  PlayerPortalAuthForm
} from "@/components/player-portal-auth-form";

export function PlayerLoginScreen() {
  return <PlayerPortalAuthForm settings={getPlayerPortalAuthSettings({})} />;
}
