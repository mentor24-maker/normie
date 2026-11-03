import Link from "next/link";
import { buildPublicPollViewPath } from "@/lib/poll-categories";
import type { DeepDivePollRef, PollDeepDiveContent } from "@/lib/poll-deep-dive";

type PollDeepDiveContentProps = {
  content: PollDeepDiveContent;
};

function PollLinkList({ polls }: { polls: DeepDivePollRef[] }) {
  if (polls.length === 0) {
    return null;
  }

  return (
    <ul className="poll-deep-dive-poll-list">
      {polls.map((poll) => (
        <li key={poll.id}>
          <Link className="poll-deep-dive-poll-link" href={buildPublicPollViewPath(poll)} prefetch={false}>
            {poll.question}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PollDeepDiveContentView({ content }: PollDeepDiveContentProps) {
  if (content.kind === "empty") {
    return <p className="panel-copy poll-deep-dive-empty">No deep dive content for this poll yet.</p>;
  }

  if (content.kind === "blog") {
    return (
      <div className="poll-deep-dive-sections">
        <section className="poll-deep-dive-section">
          <a className="poll-deep-dive-blog-card" href={content.href}>
            {content.featuredImageUrl ? (
              <div className="poll-deep-dive-blog-thumb">
                <img alt={content.title} loading="lazy" src={content.featuredImageUrl} />
              </div>
            ) : null}
            <span className="poll-deep-dive-blog-card-title">{content.title}</span>
          </a>
        </section>
      </div>
    );
  }

  if (content.kind === "youtube") {
    return (
      <div className="poll-deep-dive-sections">
        <section className="poll-deep-dive-section">
          <div className="poll-deep-dive-video">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={content.embedUrl}
              title="Deep dive video"
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="poll-deep-dive-sections">
      <section className="poll-deep-dive-section">
        <PollLinkList polls={content.polls} />
      </section>
    </div>
  );
}
