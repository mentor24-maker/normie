import type { Metadata } from "next";
import { AdminAuthHashRedirect } from "@/components/admin-auth-hash-redirect";
import { buildAuthHashBootstrapScript } from "@/lib/admin-auth-hash-redirect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Normie Polls",
  description: "Personality polls for normal people.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "392x392" },
      { url: "/icon.png", type: "image/png", sizes: "392x392" }
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "392x392" }]
  }
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
      <body suppressHydrationWarning>
        <AdminAuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
