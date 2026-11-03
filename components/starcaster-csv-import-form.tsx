"use client";

import { PersonalityCsvImportForm } from "@/components/personality-csv-import-form";

type StarcasterCsvImportFormProps = {
  onImported?: () => Promise<void> | void;
};

/** @deprecated Use PersonalityCsvImportForm with the Type A endpoint */
export function StarcasterCsvImportForm({ onImported }: StarcasterCsvImportFormProps) {
  return (
    <PersonalityCsvImportForm
      endpoint="/api/admin/polls/import-personality-type-a"
      onImported={onImported}
    />
  );
}
