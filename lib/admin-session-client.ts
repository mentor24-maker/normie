export const ADMIN_SESSION_EXPIRED_CODE = "ADMIN_SESSION_EXPIRED";
export const ADMIN_SESSION_EXPIRED_EVENT = "normie-admin-session-expired";

export function isAdminApiRequestUrl(url: string) {
  return url.includes("/api/admin/") || url.includes("/api/import");
}

export async function signOutAdminSession() {
  await fetch("/api/admin/session", { method: "DELETE" });
}

export function dispatchAdminSessionExpired() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
}

export async function handleAdminSessionExpired(router: { push: (path: string) => void; refresh: () => void }) {
  await signOutAdminSession();
  router.push("/admin?expired=1");
  router.refresh();
}
