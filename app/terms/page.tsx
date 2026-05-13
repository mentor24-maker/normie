import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { notFound } from "next/navigation";

export default async function TermsPage() {
  const page = await getPublishedBuilderPageBySlug("terms");
  if (!page) return notFound();
  return <DynamicPageShell page={page} />;
}
