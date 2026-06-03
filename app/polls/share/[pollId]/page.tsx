import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import { getSiteUrl, toAbsoluteSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase-admin";

type PollSharePageProps = {
  params: Promise<{
    pollId: string;
  }>;
};

type SharePoll = {
  id: string;
  category: string | null;
  question: string;
  image_url: string | null;
  poll_options: Array<{
    id: string;
    label: string;
    sort_order: number;
  }>;
};

const fallbackImage = "/api/admin/media-file/logo_normie_3_1600x500.png";

async function getSharePoll(pollId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, category, question, image_url, is_published, poll_options(id, label, sort_order)")
    .eq("id", pollId)
    .eq("is_published", true)
    .eq("is_hidden", false)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    poll_options: [...(data.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  } as SharePoll;
}

function getPollImageUrl(poll: SharePoll) {
  const normalized = normalizeBuilderAssetUrl(poll.image_url || fallbackImage);
  const publicImagePath = normalized.startsWith("/gallery/")
    ? `/api/admin/media-file${normalized}`
    : normalized;

  return toAbsoluteSiteUrl(publicImagePath);
}

export async function generateMetadata({ params }: PollSharePageProps): Promise<Metadata> {
  const { pollId } = await params;
  const poll = await getSharePoll(pollId);

  if (!poll) {
    return {
      title: "Normie Poll",
      description: "Answer a quick Normie poll."
    };
  }

  const title = poll.question;
  const description = poll.poll_options.length
    ? `Would you pick ${poll.poll_options.map((option) => option.label).join(" or ")}?`
    : "Answer this Normie poll.";
  const imageUrl = getPollImageUrl(poll);
  const url = `${getSiteUrl()}/polls/share/${poll.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Normie",
      type: "website",
      images: [
        {
          url: imageUrl,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function PollSharePage({ params }: PollSharePageProps) {
  const { pollId } = await params;
  const poll = await getSharePoll(pollId);

  if (!poll) {
    notFound();
  }

  const imageUrl = getPollImageUrl(poll);

  return (
    <main className="poll-share-page">
      <article className="poll-share-card">
        {poll.image_url ? (
          <Image
            alt=""
            className="poll-share-card-image"
            height={630}
            src={imageUrl}
            unoptimized
            width={1200}
          />
        ) : null}
        <div className="panel-label">{poll.category || "Normie Poll"}</div>
        <h1>{poll.question}</h1>
        {poll.poll_options.length ? (
          <div className="option-list">
            {poll.poll_options.map((option) => (
              <Link className="option-button" href="/" key={option.id}>
                {option.label}
              </Link>
            ))}
          </div>
        ) : null}
        <Link className="submit-button poll-share-card-cta" href="/">
          Answer more polls
        </Link>
      </article>
    </main>
  );
}
