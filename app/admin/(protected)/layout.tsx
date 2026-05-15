import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";
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
    redirect("/admin");
  }

  return (
    <main className="admin-page">
      <section className="admin-shell admin-shell-wide">
        <div className="admin-header">
          <div className="admin-brand">
            <Image src={logoSquare} alt="Normie logo" className="admin-brand-logo" priority />
            <div className="admin-brand-copy">
              <div className="page-eyebrow">Admin</div>
              <h1 className="admin-title">Normie Control Room</h1>
              <p className="page-copy admin-copy">
                Manage polls, imports, and modular pages from one soft, colorful workspace.
              </p>
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
