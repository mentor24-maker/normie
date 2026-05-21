import type { Metadata } from "next";
import { AdminAuthHashRedirect } from "@/components/admin-auth-hash-redirect";
import { buildAuthHashBootstrapScript } from "@/lib/admin-auth-hash-redirect";
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
            __html: buildAuthHashBootstrapScript()
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
