"use client";

import dynamic from "next/dynamic";

const AdminBuilderWorkspace = dynamic(
  () => import("@/components/admin-builder-workspace").then((module) => module.AdminBuilderWorkspace),
  {
    ssr: false,
    loading: () => (
      <section className="admin-section">
        <div className="panel-label">Builder</div>
        <h2>Loading page builder...</h2>
        <p className="page-copy admin-copy">
          Pulling in the editor only when this page is opened keeps the rest of admin lighter.
        </p>
      </section>
    )
  }
);

export function AdminBuilderPageClient() {
  return <AdminBuilderWorkspace />;
}
