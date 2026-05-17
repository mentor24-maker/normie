import Image from "next/image";
import Link from "next/link";
import logoWide from "@/images/logo_normie_3_1600x500.png";
import { SiteHeaderSocial } from "@/src/site/layout/site-header-social";

export function BlogSiteHeader() {
  return (
    <header className="site-page-header blog-site-header">
      <div className="panel blog-site-header-pod">
        <div className="blog-site-header-inner">
          <div className="blog-site-header-brand">
            <Link className="site-shell-logo-link" href="/">
              <Image alt="Normie" className="site-shell-logo" priority src={logoWide} />
            </Link>
            <Link className="blog-site-header-label" href="/blog">
              Blog
            </Link>
          </div>
          <SiteHeaderSocial />
        </div>
      </div>
    </header>
  );
}
