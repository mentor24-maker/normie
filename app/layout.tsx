import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminAuthHashRedirect } from "@/components/admin-auth-hash-redirect";
import { DevIndicatorSuppressor } from "@/components/dev-indicator-suppressor";
import { GoogleAnalytics } from "@/components/google-analytics";
import { buildAuthHashBootstrapScript } from "@/lib/admin-auth-hash-redirect";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-poll-question",
  display: "swap"
});

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
      <body className={plusJakartaSans.variable} suppressHydrationWarning>
        <GoogleAnalytics />
        <AdminAuthHashRedirect />
        {process.env.NODE_ENV === "development" ? <DevIndicatorSuppressor /> : null}
        {children}
      </body>
    </html>
  );
}
