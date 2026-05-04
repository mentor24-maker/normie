import { AdminPollsManager } from "@/components/admin-polls-manager";

export default function ImportPage() {
  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="page-eyebrow">Admin</div>
        <h1>Poll management</h1>
        <p className="page-copy">
          Import, review, and remove polls from one place. Bulk delete is available in the table
          below.
        </p>
        <AdminPollsManager />
      </section>
    </main>
  );
}
