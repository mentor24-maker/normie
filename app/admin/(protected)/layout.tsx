import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { AdminSessionGuard } from "@/components/admin-session-guard";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import logoSquare from "@/images/logo_normie_3_1000x1000.png";

export default async function ProtectedAdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    redirect("/admin?expired=1");
  }

  return (
    <main className="admin-page">
      <AdminSessionGuard />
      <section className="admin-shell admin-shell-wide">
        <div className="admin-header">
          <div className="admin-brand">
            <div className="page-eyebrow">Admin</div>
            <div className="admin-brand-main">
              <Link
                className="admin-brand-logo-link"
                href="https://normie.one"
                rel="noopener noreferrer"
              >
                <Image src={logoSquare} alt="Normie home" className="admin-brand-logo" priority />
              </Link>
              <div className="admin-brand-greeting">
                <h1 className="admin-title">Normie Control Room</h1>
                <p className="page-copy admin-copy">
                  Manage polls, imports, and modular pages from one soft, colorful workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
        <nav className="admin-nav admin-nav-bar" aria-label="Admin navigation">
          <Link className="admin-nav-link" href="/admin/dashboard">
            Home
          </Link>
          <Link className="admin-nav-link" href="/admin/polls">
            Polls
          </Link>
          <Link className="admin-nav-link" href="/admin/builder">
            Builder
          </Link>
          <Link className="admin-nav-link" href="/admin/gallery">
            Gallery
          </Link>
          <Link className="admin-nav-link" href="/admin/shop">
            Shop
          </Link>
          <Link className="admin-nav-link" href="/admin/game">
            Game
          </Link>
          <Link className="admin-nav-link" href="/admin/blog">
            Blog
          </Link>
          <Link className="admin-nav-link" href="/admin/crypto">
            Crypto
          </Link>
          <Link className="admin-nav-link" href="/admin/users">
            Users
          </Link>
          <Link className="admin-nav-link" href="/admin/team">
            Team
          </Link>
          <AdminLogoutButton />
        </nav>
        {children}
      </section>
    </main>
  );
}
