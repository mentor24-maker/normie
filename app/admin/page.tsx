import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginScreen } from "@/components/admin-login-screen";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (admin) {
    redirect("/admin/dashboard");
  }

  return <AdminLoginScreen />;
}
