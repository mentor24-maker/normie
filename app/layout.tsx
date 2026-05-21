import type { Metadata } from "next";
import { AdminAuthHashRedirect } from "@/components/admin-auth-hash-redirect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Normie Polls",
  description: "Personality polls for normal people."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname;if(p==="/admin/auth/callback"||p==="/portal/reset")return;var h=location.hash;if(!h||h.length<=1)return;var x=new URLSearchParams(h.slice(1));var s=location.search;var y=new URLSearchParams(s);if((!x.get("access_token")||!x.get("refresh_token"))&&!x.get("error")&&!x.get("error_description")&&!y.get("code")&&!y.get("token_hash"))return;location.replace("/admin/auth/callback"+s+h);})();`
          }}
        />
      </head>
      <body>
        <AdminAuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
