import Link from "next/link";

type SiteCopyrightFooterProps = {
  className?: string;
  showLinks?: boolean;
};

export function SiteCopyrightFooter({ className = "site-shell-footer", showLinks = true }: SiteCopyrightFooterProps) {
  return (
    <footer className={className}>
      {showLinks ? (
        <nav aria-label="Site links" className="site-shell-footer-links">
          <Link className="site-shell-footer-link" href="/blog">
            Blog
          </Link>
          <Link className="site-shell-footer-link" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="site-shell-footer-link" href="/terms">
            Terms of Service
          </Link>
        </nav>
      ) : null}
      <p className="site-shell-footer-copy">Copyright © 2026 Normie</p>
    </footer>
  );
}
