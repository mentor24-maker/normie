import Image from "next/image";
import Link from "next/link";
import logoWide from "@/images/logo_normie_3_1600x500.png";
import { SiteHeaderSocial } from "@/src/site/layout/site-header-social";

type SitePageHeaderProps = {
  className?: string;
};

/**
 * Site header for non-builder pages (logo + social icons).
 * Blog uses BlogSiteHeader with an added "Blog" label.
 */
export function SitePageHeader({ className }: SitePageHeaderProps) {
  const headerClassName = className ? `site-page-header ${className}` : "site-page-header";

  return (
    <header className={headerClassName}>
      <div className="site-shell-topbar site-page-header-topbar">
        <Link className="site-shell-logo-link" href="/">
          <Image alt="Normie" className="site-shell-logo" priority src={logoWide} />
        </Link>
        <SiteHeaderSocial />
      </div>
    </header>
  );
}
