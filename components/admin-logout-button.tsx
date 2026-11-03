"use client";

import { useRouter } from "next/navigation";
import { signOutAdminSession } from "@/lib/admin-session-client";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOutAdminSession();
    router.push("/admin");
    router.refresh();
  }

  return (
    <button className="admin-nav-link admin-logout-button" onClick={() => void handleLogout()} type="button">
      Logout
    </button>
  );
}
