import Image from "next/image";
import { siteHeaderSocialLinks } from "@/src/site/layout/site-social-links";

export function SiteHeaderSocial() {
  return (
    <div className="site-header-social" aria-label="Social links">
      {siteHeaderSocialLinks.map((item) => (
        <a
          className="site-header-social-link"
          href={item.href}
          key={item.id}
          rel="noopener noreferrer"
          target="_blank"
          aria-label={item.label}
          title={item.label}
        >
          <span className={`site-header-social-icon site-header-social-icon-${item.id}`}>
            <Image alt={item.label} fill sizes="56px" src={item.iconPath} unoptimized />
          </span>
        </a>
      ))}
    </div>
  );
}
