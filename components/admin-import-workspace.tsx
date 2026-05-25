"use client";

import { AdminPollRepairPanel } from "@/components/admin-poll-repair-panel";
import { AdminPollResponsePurgePanel } from "@/components/admin-poll-response-purge-panel";
import { AdminPollsManager } from "@/components/admin-polls-manager";

export function AdminImportWorkspace() {
  return (
    <section className="admin-stack">
      <AdminPollResponsePurgePanel />
      <AdminPollRepairPanel />
      <AdminPollsManager />
    </section>
  );
}
