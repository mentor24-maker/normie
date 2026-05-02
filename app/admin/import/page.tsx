import { CsvImportForm } from "@/components/csv-import-form";

export default function ImportPage() {
  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="page-eyebrow">Admin</div>
        <h1>Import poll questions from CSV</h1>
        <p className="page-copy">
          Upload a CSV where the first column is the question and each following column is one
          answer option. The importer will create polls in row order.
        </p>
        <CsvImportForm />
      </section>
    </main>
  );
}
