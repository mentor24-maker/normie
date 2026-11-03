import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { notFound } from "next/navigation";

export default async function PrivacyPage() {
  const page = await getPublishedBuilderPageBySlug("privacy");
  if (!page) return notFound();
  return <DynamicPageShell page={page} />;
}
