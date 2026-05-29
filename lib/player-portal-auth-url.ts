import type { PlayerPortalAuthMode } from "@/components/player-portal-auth-form";

export const PLAYER_PORTAL_AUTH_MODE_PARAM = "mode";
export const PLAYER_PORTAL_AUTH_SECTION_ID = "player-portal-auth";
export const PLAYER_PORTAL_REGISTER_HREF = `/portal?${PLAYER_PORTAL_AUTH_MODE_PARAM}=register#${PLAYER_PORTAL_AUTH_SECTION_ID}`;

export function getPlayerPortalAuthModeFromLocation(
  search = "",
  hash = ""
): PlayerPortalAuthMode | null {
  const param = new URLSearchParams(search).get(PLAYER_PORTAL_AUTH_MODE_PARAM)?.trim().toLowerCase();

  if (param === "register" || param === "login") {
    return param;
  }

  const normalizedHash = hash.replace(/^#/, "").trim().toLowerCase();

  if (normalizedHash === PLAYER_PORTAL_AUTH_SECTION_ID || normalizedHash === "register") {
    return "register";
  }

  if (normalizedHash === "login") {
    return "login";
  }

  return null;
}

export function focusPlayerPortalAuthForm(mode: PlayerPortalAuthMode = "register"): void {
  if (typeof window === "undefined") {
    return;
  }

  const shell = document.getElementById(PLAYER_PORTAL_AUTH_SECTION_ID);

  if (!shell) {
    return;
  }

  shell.scrollIntoView({ behavior: "smooth", block: "center" });

  window.requestAnimationFrame(() => {
    const selector =
      mode === "register" ? 'input[name="name"]' : 'input[name="username"]';
    shell.querySelector<HTMLInputElement>(selector)?.focus({ preventScroll: true });
  });
}
