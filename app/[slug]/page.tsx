import { cookies } from "next/headers";
import { getPublishedBuilderPageBySlug } from "@/lib/builder-pages";
import { getAuthorizedPlayerFromCookieStore } from "@/lib/player-auth";
import { DynamicPageShell } from "@/src/site/dynamic/dynamic-page-shell";
import { notFound, redirect } from "next/navigation";

type DynamicBuilderPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function DynamicBuilderPage({ params }: DynamicBuilderPageProps) {
  const { slug } = await params;

  if (slug === "portal") {
    const cookieStore = await cookies();
    const player = await getAuthorizedPlayerFromCookieStore(cookieStore);

    if (player) {
      redirect("/portal/dashboard");
    }
  }

  const page = await getPublishedBuilderPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <DynamicPageShell page={page} />;
}
