"use client";

import { AdminPollRepairPanel } from "@/components/admin-poll-repair-panel";
import { AdminPollsManager } from "@/components/admin-polls-manager";

export function AdminImportWorkspace() {
  return (
    <section className="admin-stack">
      <AdminPollRepairPanel />
      <AdminPollsManager />
    </section>
  );
}
