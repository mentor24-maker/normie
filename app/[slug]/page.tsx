import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { notFound } from "next/navigation";

type DynamicBuilderPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function DynamicBuilderPage({ params }: DynamicBuilderPageProps) {
  const { slug } = await params;
  const page = await getPublishedBuilderPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <DynamicPageShell page={page} />;
}
