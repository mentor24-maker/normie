"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <button className="admin-nav-link admin-logout-button" onClick={() => void handleLogout()} type="button">
      Logout
    </button>
  );
}
