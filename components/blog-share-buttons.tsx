"use client";

import { getSiteUrl } from "@/lib/site-url";

type BlogShareButtonsProps = {
  url: string;
  title: string;
};

export function BlogShareButtons({ url, title }: BlogShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const origin = getSiteUrl();

  const links = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    }
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="blog-share">
      <span className="blog-share-label">Share</span>
      <div className="blog-share-actions">
        {links.map((link) => (
          <a
            className="blog-share-button"
            href={link.href}
            key={link.label}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
        <button className="blog-share-button" onClick={() => void copyLink()} type="button">
          Copy link
        </button>
      </div>
      <span className="gallery-meta">{origin}</span>
    </div>
  );
}
