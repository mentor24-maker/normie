import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <section className="admin-hub-grid">
      <article className="admin-hub-card admin-hub-card-blue">
        <div className="panel-label">Polls</div>
        <h2>Poll uploads and management</h2>
        <p className="panel-copy">
          Bring in CSVs, review the full poll list, and bulk delete anything you do not want live.
        </p>
        <Link className="admin-hub-link" href="/admin/polls">
          Open Polls
        </Link>
      </article>
      <article className="admin-hub-card admin-hub-card-gold">
        <div className="panel-label">Builder</div>
        <h2>Modular page templates</h2>
        <p className="panel-copy">
          Assemble reusable sections, layouts, and content modules with a live preview.
        </p>
        <Link className="admin-hub-link" href="/admin/builder">
          Open Builder
        </Link>
      </article>
      <article className="admin-hub-card admin-hub-card-mint">
        <div className="panel-label">Gallery</div>
        <h2>Local media library</h2>
        <p className="panel-copy">
          Browse `/images`, upload fresh assets into `/images/gallery`, and reuse them in the builder.
        </p>
        <Link className="admin-hub-link" href="/admin/gallery">
          Open Gallery
        </Link>
      </article>
    </section>
  );
}
